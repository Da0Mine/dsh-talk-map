/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰色虚线，看得见。
 * 同步中 → 整条线透明度 0，看不见（东西已经到位，不需要再提示）。
 *
 * 没有发光、没有流光、没有粒子：线要么在，要么不在。箭头跟着线一起隐藏。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { routeBetween, roundedPath, type Face, type Point, type Rect } from './edge-route.ts'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
  /** A structural link (fork), which never hides itself. */
  structural?: boolean
  /** Every other painted card, in flow coordinates — the line must avoid them. */
  obstacles?: readonly Rect[]
  /** The two endpoint cards' real boxes (used to exclude them from obstacles). */
  fromRect?: Rect
  toRect?: Rect
}

export function TalkMapEdge(props: EdgeProps): React.JSX.Element {
  const data = (props.data ?? {}) as TalkMapEdgeData
  const synced = data.sync === 'synced'
  // Only transfer lines disappear once they are in sync; a fork link is part of
  // the map structure and stays where it is.
  const hidden = synced && data.structural !== true
  /**
   * Route here rather than on the canvas: React Flow hands us the *real* handle
   * positions, and the cards' rendered height is content-driven, so anchors
   * computed from the layout constants sit above the actual card edge.
   */
  const faceOf = (position: unknown): Face => {
    const name = String(position ?? 'left')
    if (name === 'right') return 'r'
    if (name === 'top') return 't'
    if (name === 'bottom') return 'b'
    return 'l'
  }
  const obstacles = data.obstacles
  const route = obstacles === undefined
    ? undefined
    : routeBetween(
        {
          start: { x: props.sourceX, y: props.sourceY },
          startFace: faceOf(props.sourcePosition),
          end: { x: props.targetX, y: props.targetY },
          endFace: faceOf(props.targetPosition),
        },
        // The endpoints' real boxes: the router excludes them from the obstacle
        // set by geometry. A degenerate 0×0 box never matches, so the endpoints
        // used to block their own handles and every line fell back to a straight L.
        data.fromRect ?? { x: props.sourceX, y: props.sourceY, w: 0, h: 0 },
        data.toRect ?? { x: props.targetX, y: props.targetY, w: 0, h: 0 },
        obstacles,
      )
  const routed = route !== undefined && route.length > 1
  // 调试钩子：渲染脚本据此核对组件实际拿到的数据（生产环境无副作用）
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __edgeDebug?: unknown[] }
    w.__edgeDebug = w.__edgeDebug ?? []
    ;(w.__edgeDebug as unknown[]).push({
      id: props.id,
      obstacles: obstacles?.length ?? null,
      fromRect: data.fromRect ?? null,
      toRect: data.toRect ?? null,
      src: { x: props.sourceX, y: props.sourceY, pos: String(props.sourcePosition) },
      dst: { x: props.targetX, y: props.targetY, pos: String(props.targetPosition) },
      points: route ?? null,
    })
  }
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
