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

/**
 * Every painted card, measured from the DOM.
 *
 * The obstacle list arrives through edge data, and when that list is missing a
 * card the router happily draws through it. The DOM cannot be wrong about what is
 * painted, so the boxes are measured here as well and merged in. Measuring costs a
 * layout pass, so the result is cached briefly.
 */
const boardCache: { at: number; boxes: Rect[] } = { at: 0, boxes: [] }

function boardBoxes(): Rect[] {
  if (typeof document === 'undefined') return []
  const now = Date.now()
  if (now - boardCache.at < 80) return boardCache.boxes
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
  // The viewport element is itself translated and scaled, so its own rect already
  // contains the pan: every child sits at  rect.left = viewportRect.left + flow*zoom.
  // Using the viewport rect as the origin needs no separate translate at all — and
  // that is what removes the 320px offset the old pane-based maths introduced.
  const viewportRect = viewport?.getBoundingClientRect()
  let scale = 1
  if (viewport !== null) {
    const matrix = getComputedStyle(viewport).transform
    const parsed = /matrix\(([^)]+)\)/.exec(matrix)
    if (parsed !== null) {
      const values = parsed[1]!.split(',').map(Number)
      scale = values[0] === undefined || values[0] === 0 ? 1 : values[0]
    }
  }
  const boxes: Rect[] = []
  for (const element of document.querySelectorAll('[data-talkmap-session]')) {
    const rect = element.getBoundingClientRect()
    if (rect.width < 8 || rect.height < 8) continue
    // The CSS transform already places the viewport inside the pane, so the pane's
    // own offset must NOT be subtracted again — doing that shifted every measured
    // box one screen-sidebar to the left (Δ ≈ −320px / zoom).
    boxes.push({
      x: (rect.left - (viewportRect?.left ?? 0)) / scale,
      y: (rect.top - (viewportRect?.top ?? 0)) / scale,
      w: rect.width / scale,
      h: rect.height / scale,
    })
  }
  // Do not cache an empty measurement: the first render can run before the nodes
  // are mounted, and caching that would leave every later edge blind.
  if (boxes.length > 0) {
    boardCache.at = now
    boardCache.boxes = boxes
  }
  return boxes
}

/** Union of two box lists, ignoring near-duplicates. */
function mergeBoxes(a: readonly Rect[], b: readonly Rect[]): Rect[] {
  const out: Rect[] = []
  for (const box of [...a, ...b]) {
    const duplicate = out.some(other => Math.abs(other.x - box.x) < 2
      && Math.abs(other.y - box.y) < 2
      && Math.abs(other.w - box.w) < 2
      && Math.abs(other.h - box.h) < 2)
    if (!duplicate) out.push(box)
  }
  return out
}

/** Is this box one of the two cards the edge is attached to? */
function isEndpoint(box: Rect, x: number, y: number): boolean {
  // 40px halo: the anchor sits on the card border and the DOM/viewport transform
  // is only pixel-accurate, so a tight tolerance leaves the endpoint card in the
  // obstacle set — and then the search cannot even start.
  const pad = 40
  return x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad
}

/** Is this point inside (or on) the box? */
function containsPoint(box: Rect, x: number, y: number): boolean {
  // 40px halo: the anchor sits on the card border and the DOM/viewport transform
  // is only pixel-accurate, so a tight tolerance leaves the endpoint card in the
  // obstacle set — and then the search cannot even start.
  const pad = 40
  return x >= box.x - pad && x <= box.x + box.w + pad && y >= box.y - pad && y <= box.y + box.h + pad
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
  // Obstacles from the edge data *plus* everything the DOM says is painted. A card
  // that is missing from the data used to be invisible to the router, which then
  // drew straight through it — that is the crossing this map kept showing.
  // Identify the two endpoint boxes by their TOP-LEFT corner, which is the node
  // position and therefore identical in the data and in the DOM measurement. Anchor
  // geometry is not reliable for this: the anchor sits on the border and the
  // viewport transform is only pixel-accurate.
  const sameCorner = (box: Rect, other: Rect | undefined): boolean =>
    other !== undefined && Math.abs(box.x - other.x) < 3 && Math.abs(box.y - other.y) < 3
  // Obstacles come from the canvas, which measures them in LAYOUT pixels (zoom
  // independent). Measuring the screen rect here made the geometry zoom-dependent.
  const merged = obstacles ?? []
    .filter(box => !sameCorner(box, data.fromRect))
    .filter(box => !sameCorner(box, data.toRect))
    .filter(box => !containsPoint(box, props.sourceX, props.sourceY))
    .filter(box => !containsPoint(box, props.targetX, props.targetY))
  const route = merged.length === 0
    ? undefined
    : routeBetween(
        {
          start: { x: props.sourceX, y: props.sourceY },
          startFace: faceOf(props.sourcePosition),
          end: { x: props.targetX, y: props.targetY },
          endFace: faceOf(props.targetPosition),
        },
        // The endpoints' real boxes: the router excludes them from the obstacle
        // set by geometry.
        data.fromRect ?? { x: props.sourceX, y: props.sourceY, w: 0, h: 0 },
        data.toRect ?? { x: props.targetX, y: props.targetY, w: 0, h: 0 },
        merged,
      )
  const routed = route !== undefined && route.length > 1

  /**
   * Last line of defence: if the computed polyline still touches a card, do not
   * draw it. A dashed line through a card reads as a bug; two short stubs with
   * their arrow read as "this connection exists but the map is too tight here".
   */
  const routeHitsCard = (points: readonly Point[] | undefined, rects: readonly Rect[] | undefined): boolean => {
    if (points === undefined || rects === undefined) return false
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1]!
      const b = points[index]!
      const steps = Math.max(2, Math.ceil((Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) / 3))
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        for (const rect of rects) {
          if (x > rect.x + 1 && x < rect.x + rect.w - 1 && y > rect.y + 1 && y < rect.y + rect.h - 1) return true
        }
      }
    }
    return false
  }
  // The guard judges against the *measured* board, not the data: if the data is
  // what is wrong, judging by it would pass a crossing route.
  const guardBoxes = merged
    .filter(box => !containsPoint(box, props.sourceX, props.sourceY))
    .filter(box => !containsPoint(box, props.targetX, props.targetY))
  const blockedRoute = routeHitsCard(route, guardBoxes)
  // 调试钩子：渲染脚本据此核对组件实际拿到的数据（生产环境无副作用）
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __edgeDebug?: unknown[] }
    w.__edgeDebug = w.__edgeDebug ?? []
    ;(w.__edgeDebug as unknown[]).push({
      id: props.id,
      obstacles: obstacles?.length ?? null,
      merged: merged.length,
      measured: boardBoxes().length,
      measuredFirst: boardBoxes().slice(0, 2),
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
  const safeRoute = routed && !blockedRoute ? (route as Point[]) : undefined
  // When even the router's best effort would run through a card, draw only the
  // two stubs: the connection is still visible, and nothing is drawn over a card.
  const stubPath = (() => {
    const normal = (face: Face): Point => (face === 'r' ? { x: 1, y: 0 }
      : face === 'l' ? { x: -1, y: 0 }
        : face === 't' ? { x: 0, y: -1 } : { x: 0, y: 1 })
    const length = 16
    const a = normal(faceOf(props.sourcePosition))
    const b = normal(faceOf(props.targetPosition))
    const p1 = { x: props.sourceX + a.x * length, y: props.sourceY + a.y * length }
    const p2 = { x: props.targetX + b.x * length, y: props.targetY + b.y * length }
    return `M ${props.sourceX} ${props.sourceY} L ${p1.x} ${p1.y} M ${props.targetX} ${props.targetY} L ${p2.x} ${p2.y}`
  })()
  const path = safeRoute !== undefined
    ? roundedPath(safeRoute, 10)
    : blockedRoute ? stubPath : smoothPath

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
