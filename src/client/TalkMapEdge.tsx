/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰色虚线，看得见。
 * 同步中 → 整条线透明度 0，看不见（东西已经到位，不需要再提示）。
 *
 * 没有发光、没有流光、没有粒子：线要么在，要么不在。箭头跟着线一起隐藏。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { roundedPath, type Point } from './edge-route.ts'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
  /** A structural link (fork), which never hides itself. */
  structural?: boolean
  /** Waypoints computed on the canvas, so the line goes around cards. */
  route?: readonly Point[]
}

export function TalkMapEdge(props: EdgeProps): React.JSX.Element {
  const data = (props.data ?? {}) as TalkMapEdgeData
  const synced = data.sync === 'synced'
  // Only transfer lines disappear once they are in sync; a fork link is part of
  // the map structure and stays where it is.
  const hidden = synced && data.structural !== true
  // The canvas routes every line on an orthogonal grid that avoids card bodies;
  // the smoothstep fallback only matters if a route is missing.
  const route = data.route
  const routed = route !== undefined && route.length > 1
  const [smoothPath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  const path = routed ? roundedPath(route as Point[], 10) : smoothPath

  /**
   * Which way the arrow points: the last leg of the route (or, without one, the
   * face the line enters through).
   */
  const arrowAngle = (() => {
    if (routed) {
      const end = route[route.length - 1]!
      const before = route[route.length - 2]!
      const dx = end.x - before.x
      const dy = end.y - before.y
      if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 0 : 180
      return dy >= 0 ? 90 : -90
    }
    const position = String(props.targetPosition ?? 'left')
    if (position === 'right') return 180
    if (position === 'top') return 90
    if (position === 'bottom') return -90
    return 0
  })()

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        style={{
          stroke: 'rgba(200, 206, 216, 0.45)',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeDasharray: '6 5',
          // Synced: the line simply is not there any more.
          opacity: hidden ? 0 : 1,
        }}
      />

      <path
        d="M0 0 L-11 -5 L-11 5 Z"
        transform={`translate(${props.targetX} ${props.targetY}) rotate(${arrowAngle})`}
        fill="rgba(200, 206, 216, 0.5)"
        opacity={hidden ? 0 : 1}
        pointerEvents="none"
      />
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
