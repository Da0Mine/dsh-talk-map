/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰白静态虚线。
 * 同步中 → 灰白静态实线，一枚"流光"沿路径滑过：亮头在前、渐弱的尾段拖后，
 * 和卡片运行光环（conic 扫描）同一套气质——大部分时间线是安静的，只有
 * 那一道光在走。
 *
 * 做法：三层同一路径、同一个相位，仅长度/粗细/模糊不同，末端对齐（各自的
 * dash 都以"头"的位置收尾）。叠加出来的强度剖面就是卡片光环那道 conic 的
 * 平移版：透明 → 缓慢爬升的尾 → 亮头 → 骤然截止。全部归一到 pathLength=100，
 * 一循环位移 -100，恰好一整次传输，接缝无缝；每条线的相位由 id 哈希错开。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
}

/** One full traversal of the line. */
const FLOW_MS = 2800

/**
 * The sweep, back to front. Aligned at their END (the head): the long dim
 * layer trails, the short bright one leads — stacking them yields a smooth
 * rise-then-peak profile instead of visible segments.
 */
const SWEEP_LAYERS: {
  len: number
  width: number
  stroke: string
  className: string
}[] = [
  { len: 30, width: 6, stroke: 'rgba(190, 214, 255, 0.20)', className: 'tmEdgeTail' },
  { len: 16, width: 3.6, stroke: 'rgba(220, 234, 255, 0.50)', className: 'tmEdgeMid' },
  { len: 7, width: 2.4, stroke: 'rgba(255, 255, 255, 0.98)', className: 'tmEdgeHead' },
]

/** Stable hash → per-edge phase, so parallel lines don't sweep in lockstep. */
function hashOf(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

export function TalkMapEdge(props: EdgeProps): React.JSX.Element {
  const data = (props.data ?? {}) as TalkMapEdgeData
  const synced = data.sync === 'synced'
  const [path] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  const delay = -((hashOf(props.id ?? '') % 1000) / 1000) * FLOW_MS

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        {...(props.markerEnd !== undefined ? { markerEnd: props.markerEnd } : {})}
        style={{
          // Grey-white either way: only the dash pattern and the sweep change.
          stroke: synced ? 'rgba(226, 232, 242, 0.6)' : 'rgba(200, 206, 216, 0.34)',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          ...(synced ? {} : { strokeDasharray: '6 5' }),
        }}
      />
      {synced
        ? SWEEP_LAYERS.map(layer => (
            <path
              key={layer.className}
              className={layer.className}
              d={path}
              pathLength={100}
              fill="none"
              stroke={layer.stroke}
              strokeWidth={layer.width}
              strokeLinecap="round"
              strokeDasharray={`${layer.len} ${100 - layer.len}`}
              style={{ '--edge-dash': String(layer.len), animationDelay: `${delay}ms` } as React.CSSProperties}
              pointerEvents="none"
            />
          ))
        : null}
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
