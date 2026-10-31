/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰线，基本不发光。
 * 同步中 → 实线 + 外发光（一层模糊的宽描边垫在下面，再叠一条亮线）。
 *
 * 没有流动光斑：线本身亮起来就够了。箭头自己画——React Flow 的 edge marker
 * 不会传给自定义边组件。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
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

  /**
   * Which way the arrow points: the path arrives at the target handle, so the
   * head follows that face (left → pointing right, top → pointing down, …).
   */
  const arrowAngle = (() => {
    const position = String(props.targetPosition ?? 'left')
    if (position === 'right') return 180
    if (position === 'top') return 90
    if (position === 'bottom') return -90
    return 0
  })()

  return (
    <>
      {/* The glow: the same path, wide and blurred, under the crisp line. */}
      {synced
        ? (
            <path
              d={path}
              fill="none"
              stroke="rgba(196, 219, 255, 0.55)"
              strokeWidth={7}
              strokeDasharray="6 5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'blur(4px)', pointerEvents: 'none' }}
            />
          )
        : null}

      <BaseEdge
        id={props.id}
        path={path}
        style={{
          stroke: synced ? 'rgba(240, 246, 255, 0.96)' : 'rgba(200, 206, 216, 0.42)',
          strokeWidth: synced ? 1.9 : 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          // Dashed again: the light is in the halo, not in a solid core.
          strokeDasharray: '6 5',
          ...(synced
            ? { filter: 'drop-shadow(0 0 3px rgba(190, 214, 255, 0.6))' }
            : {}),
        }}
      />

      <path
        d="M0 0 L-11 -5 L-11 5 Z"
        transform={`translate(${props.targetX} ${props.targetY}) rotate(${arrowAngle})`}
        fill={synced ? 'rgba(240, 246, 255, 0.92)' : 'rgba(200, 206, 216, 0.5)'}
        pointerEvents="none"
      />
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
