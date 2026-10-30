/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰白静态虚线。
 * 同步中 → 灰白静态实线，一枚"彗星"沿路径流动：亮头 + 渐弱的尾段，下面垫一层
 * 模糊的光晕。三层都归一到 pathLength=100，动画位移恰好 -100/循环，任意长度
 * 的线都是一整次"传输"每周期，接缝无缝。
 *
 * Why dashes and not particles: a dash train with round caps (`9 3 5 3 2.5 …`)
 * IS a tapering comet — one path, no per-frame JS, and `stroke-dashoffset` at a
 * constant rate reads as a steady stream. The per-edge negative delay comes from
 * a hash of the edge id, so parallel lines never pulse in lockstep.
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
}

/** One full traversal of the line. */
const FLOW_MS = 3200

/** Stable 31-bit hash → per-edge phase, so comets don't march in unison. */
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
          // Grey-white either way: only the dash pattern and the comet change.
          stroke: synced ? 'rgba(226, 232, 242, 0.6)' : 'rgba(200, 206, 216, 0.34)',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          ...(synced ? {} : { strokeDasharray: '6 5' }),
        }}
      />
      {synced
        ? (
            <>
              {/* Bloom: a soft wide blob riding under the comet's head. */}
              <path
                className="tmEdgeBloom"
                d={path}
                pathLength={100}
                fill="none"
                stroke="rgba(186, 214, 255, 0.5)"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray="15 85"
                style={{ animationDelay: `${delay}ms` }}
                pointerEvents="none"
              />
              {/* The comet: bright head, then a tapering tail of shorter dashes. */}
              <path
                className="tmEdgeComet"
                d={path}
                pathLength={100}
                fill="none"
                stroke="rgba(240, 247, 255, 0.95)"
                strokeWidth={2.3}
                strokeLinecap="round"
                strokeDasharray="9 3 5 3 2.5 77.5"
                style={{ animationDelay: `${delay}ms` }}
                pointerEvents="none"
              />
            </>
          )
        : null}
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
