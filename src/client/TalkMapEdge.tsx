/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰白静态虚线。
 * 同步中 → 同样灰白、但是静态实线，上面有一串光点沿路径流过去（传输感）。
 *
 * The dots are a second path with `stroke-dasharray: 0 14` + round caps: each
 * zero-length dash with a round cap draws a dot, and animating `stroke-dashoffset`
 * by a multiple of the gap makes the run seamless.
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

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        {...(props.markerEnd !== undefined ? { markerEnd: props.markerEnd } : {})}
        style={{
          // Grey-white either way: only the dash pattern and the packet change.
          stroke: synced ? 'rgba(232, 236, 244, 0.55)' : 'rgba(200, 206, 216, 0.34)',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          ...(synced ? {} : { strokeDasharray: '6 5' }),
        }}
      />
      {synced
        ? (
            <path
              className="tmEdgeFlow"
              d={path}
              fill="none"
              stroke="rgba(255, 246, 214, 0.95)"
              strokeWidth={2.6}
              strokeLinecap="round"
              // A zero-length dash with a round cap IS a dot.
              strokeDasharray="0 16"
              pointerEvents="none"
            />
          )
        : null}
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
