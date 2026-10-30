/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰白静态虚线。
 * 同步中 → 灰白静态实线，一道**连续的光带**沿路径从源滑到目标，带柔光晕。
 *
 * 为什么是"一条"而不是很多点：早先试过的圆点阵列无论多密都会有颗粒感，多层
 * dash 又会在接缝处露硬边。这里只用一条 dash —— 但它是**百分比长度**的
 * （pathLength=100），所以任意长度的线都是同一段相对长度；前后各端靠模糊化开，
 * 于是读起来是一团连续的光，而不是一串珠子。
 *
 * 位移走 0.1→1 的 spline：起步淡入（源头"点亮"），到站停在末端，回程发生在
 * 完全移出路径的时候，所以看不到跳变。和卡片运行光环一个道理：只有一段在亮。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
}

/** One full traversal of the line, in seconds. */
const FLOW_S = 2.6

/**
 * The travelling light, two stacked bands:
 *   core — short, bright, lightly blurred (the "head")
 *   halo — longer, wide and very soft (the glow around it)
 * Lengths are percent of the path (pathLength = 100).
 */
const CORE = { len: 12, width: 2.6, blur: 1.1, opacity: 0.95 }
const HALO = { len: 20, width: 9, blur: 5, opacity: 0.45 }

/** Stable hash → per-edge phase, so parallel lines don't sweep in lockstep. */
function hashOf(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
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
  const phase = -((hashOf(props.id ?? '') % 1000) / 1000) * FLOW_S
  const flowing = synced && !prefersReducedMotion()

  /** One travelling band. */
  const band = (band: typeof CORE, stroke: string, key: string): React.JSX.Element => (
    <path
      key={key}
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={band.width}
      strokeLinecap="round"
      // Percent lengths: the same relative band on every edge, whatever its length.
      pathLength={100}
      strokeDasharray={`${band.len} ${100 - band.len}`}
      style={{ filter: `blur(${band.blur}px)`, pointerEvents: 'none' }}
    >
      {/* Enter during the first 10%, then ride to the far end; the wrap home
          happens while the band is off the path, so nothing pops. */}
      <animate
        attributeName="stroke-dashoffset"
        dur={`${FLOW_S}s`}
        begin={`${phase}s`}
        repeatCount="indefinite"
        values={`${band.len};0;${-(100 - band.len)}`}
        keyTimes="0;0.1;1"
        calcMode="spline"
        keySplines="0.4 0 0.6 1;0.3 0 0.5 1"
      />
    </path>
  )

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        {...(props.markerEnd !== undefined ? { markerEnd: props.markerEnd } : {})}
        style={{
          // Grey-white either way: only the dash pattern and the light change.
          stroke: synced ? 'rgba(226, 232, 242, 0.6)' : 'rgba(200, 206, 216, 0.34)',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          ...(synced ? {} : { strokeDasharray: '6 5' }),
        }}
      />
      {flowing
        ? (
            <>
              {band(HALO, `rgba(190, 214, 255, ${HALO.opacity})`, 'halo')}
              {band(CORE, `rgba(255, 255, 255, ${CORE.opacity})`, 'core')}
            </>
          )
        : null}
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
