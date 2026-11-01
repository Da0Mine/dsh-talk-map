/**
 * Orthogonal edge routing that goes around cards.
 *
 * Straight/L-shaped connectors happily cut through whatever card happens to sit
 * between two endpoints. This module routes on a coarse orthogonal grid built
 * from **the centres of the gaps between cards**, so a line that cannot go direct
 * leaves through the nearest channel and comes back — never over a card body.
 *
 * Pure on purpose: routing is the part worth testing, the canvas is not.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export type Face = 't' | 'r' | 'b' | 'l'

export interface Point {
  x: number
  y: number
}

export interface RouteOptions {
  /** Clearance kept between a line and any card. */
  margin?: number
  /** Straight run out of the handle before the line may turn. */
  stub?: number
  /** Gaps narrower than this are treated as impassable. */
  minCorridor?: number
}

const DEFAULTS = { margin: 10, stub: 14, minCorridor: 28 }

/** Middle of the face an edge leaves from. */
export function anchorOf(rect: Rect, face: Face): Point {
  switch (face) {
    case 'r': return { x: rect.x + rect.w, y: rect.y + rect.h / 2 }
    case 'l': return { x: rect.x, y: rect.y + rect.h / 2 }
    case 't': return { x: rect.x + rect.w / 2, y: rect.y }
    default: return { x: rect.x + rect.w / 2, y: rect.y + rect.h }
  }
}

/** Outward unit direction of a face. */
export function normalOf(face: Face): Point {
  switch (face) {
    case 'r': return { x: 1, y: 0 }
    case 'l': return { x: -1, y: 0 }
    case 't': return { x: 0, y: -1 }
    default: return { x: 0, y: 1 }
  }
}

function expand(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + by * 2, h: rect.h + by * 2 }
}

function insideStrict(rect: Rect, point: Point): boolean {
  return point.x > rect.x && point.x < rect.x + rect.w
    && point.y > rect.y && point.y < rect.y + rect.h
}

/** Does a horizontal run at `y` between `x1` and `x2` hit any rect? */
function hitsHorizontal(rects: Rect[], y: number, x1: number, x2: number): boolean {
  const lo = Math.min(x1, x2)
  const hi = Math.max(x1, x2)
  for (const rect of rects) {
    if (y <= rect.y || y >= rect.y + rect.h) continue
    if (hi <= rect.x || lo >= rect.x + rect.w) continue
    return true
  }
  return false
}

/** Does a vertical run at `x` between `y1` and `y2` hit any rect? */
function hitsVertical(rects: Rect[], x: number, y1: number, y2: number): boolean {
  const lo = Math.min(y1, y2)
  const hi = Math.max(y1, y2)
  for (const rect of rects) {
    if (x <= rect.x || x >= rect.x + rect.w) continue
    if (hi <= rect.y || lo >= rect.y + rect.h) continue
    return true
  }
  return false
}

/**
 * Centres of the empty channels between cards, per axis.
 *
 * Cards are clustered into bands along the axis; every gap wide enough to route
 * through contributes its midpoint — that is what makes lines pass through the
 * *middle* of a gap rather than hugging one card.
 */
/** Merged [start, end] spans of the cards along one axis. */
export function bands(rects: Rect[], axis: 'x' | 'y'): { start: number; end: number }[] {
  const spans = rects
    .map(rect => (axis === 'x'
      ? { start: rect.x, end: rect.x + rect.w }
      : { start: rect.y, end: rect.y + rect.h }))
    .sort((a, b) => a.start - b.start)

  const out: { start: number; end: number }[] = []
  for (const span of spans) {
    const last = out[out.length - 1]
    if (last !== undefined && span.start <= last.end) {
      last.end = Math.max(last.end, span.end)
    } else {
      out.push({ ...span })
    }
  }
  return out
}

export function corridors(rects: Rect[], axis: 'x' | 'y', minCorridor: number): number[] {
  const merged = bands(rects, axis)
  const out: number[] = []
  for (let index = 1; index < merged.length; index += 1) {
    const gap = merged[index]!.start - merged[index - 1]!.end
    if (gap >= minCorridor) out.push((merged[index - 1]!.end + merged[index]!.start) / 2)
  }
  return out
}

/**
 * Lines that run just outside the whole cluster of cards.
 *
 * Without these the grid only had channels *between* cards, so a card sitting on
 * the direct run left the search nothing to go through and it fell back to a
 * crossing line.
 */
export function outerLines(rects: Rect[], axis: 'x' | 'y', clearance: number): number[] {
  const merged = bands(rects, axis)
  const out: number[] = []
  for (const band of merged) {
    out.push(band.start - clearance, band.end + clearance)
  }
  return out
}

class Heap {
  private items: { key: number; cost: number; node: string }[] = []

  push(cost: number, key: number, node: string): void {
    this.items.push({ cost, key, node })
    let index = this.items.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (this.items[parent]!.cost <= this.items[index]!.cost) break
      const tmp = this.items[parent]!
      this.items[parent] = this.items[index]!
      this.items[index] = tmp
      index = parent
    }
  }

  pop(): { key: number; node: string } | undefined {
    if (this.items.length === 0) return undefined
    const top = this.items[0]!
    const last = this.items.pop()!
    if (this.items.length > 0) {
      this.items[0] = last
      let index = 0
      for (;;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (left < this.items.length && this.items[left]!.cost < this.items[smallest]!.cost) smallest = left
        if (right < this.items.length && this.items[right]!.cost < this.items[smallest]!.cost) smallest = right
        if (smallest === index) break
        const tmp = this.items[smallest]!
        this.items[smallest] = this.items[index]!
        this.items[index] = tmp
        index = smallest
      }
    }
    return { key: top.key, node: top.node }
  }

  get size(): number {
    return this.items.length
  }
}

function dedupe(values: number[], epsilon = 0.5): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const out: number[] = []
  for (const value of sorted) {
    if (out.length === 0 || Math.abs(value - out[out.length - 1]!) > epsilon) out.push(value)
  }
  return out
}

/** Collapse repeated and collinear points. */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last !== undefined && Math.abs(last.x - point.x) < 0.5 && Math.abs(last.y - point.y) < 0.5) continue
    out.push(point)
  }
  for (let index = 1; index < out.length - 1;) {
    const a = out[index - 1]!
    const b = out[index]!
    const c = out[index + 1]!
    const collinear = (Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5)
      || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)
    if (collinear) out.splice(index, 1)
    else index += 1
  }
  return out
}

/**
 * Route from one face of `from` to one face of `to`, staying out of every card.
 *
 * Falls back to a plain L when the grid cannot find a way (dense boards): a
 * crossing line is still better than no line at all.
 */
export function routeEdge(
  from: Rect,
  to: Rect,
  fromFace: Face,
  toFace: Face,
  obstacles: readonly Rect[],
  options: RouteOptions = {},
): Point[] {
  const margin = options.margin ?? DEFAULTS.margin
  const stub = options.stub ?? DEFAULTS.stub
  const minCorridor = options.minCorridor ?? DEFAULTS.minCorridor

  const start = anchorOf(from, fromFace)
  const end = anchorOf(to, toFace)
  const startNormal = normalOf(fromFace)
  const endNormal = normalOf(toFace)
  const startStub = { x: start.x + startNormal.x * stub, y: start.y + startNormal.y * stub }
  const endStub = { x: end.x + endNormal.x * stub, y: end.y + endNormal.y * stub }

  // Blocked bodies: everything except the two endpoints themselves.
  const blocked = obstacles
    .filter(rect => rect !== from && rect !== to)
    .map(rect => expand(rect, margin))

  const fallback = simplify([start, startStub, { x: endStub.x, y: startStub.y }, endStub, end])

  // Channels between cards, plus lines just outside the whole cluster so a card
  // sitting on the direct run can still be walked around.
  const xs = corridors(obstacles as Rect[], 'x', minCorridor)
  const ys = corridors(obstacles as Rect[], 'y', minCorridor)
  const xOuter = outerLines(obstacles as Rect[], 'x', margin + 6)
  const yOuter = outerLines(obstacles as Rect[], 'y', margin + 6)
  const xCands = dedupe([start.x, end.x, startStub.x, endStub.x, ...xs, ...xOuter])
  const yCands = dedupe([start.y, end.y, startStub.y, endStub.y, ...ys, ...yOuter])
  if (xCands.length > 60 || yCands.length > 60) return fallback

  const corridorX = new Set(xs.map(value => Math.round(value)))
  const corridorY = new Set(ys.map(value => Math.round(value)))
  const nodeId = (ix: number, iy: number): string => `${ix},${iy}`
  const pointAt = (id: string): Point => {
    const [ix, iy] = id.split(',').map(Number)
    return { x: xCands[ix]!, y: yCands[iy]! }
  }

  const startIndex = { x: xCands.findIndex(value => Math.abs(value - startStub.x) < 0.5), y: yCands.findIndex(value => Math.abs(value - startStub.y) < 0.5) }
  const endIndex = { x: xCands.findIndex(value => Math.abs(value - endStub.x) < 0.5), y: yCands.findIndex(value => Math.abs(value - endStub.y) < 0.5) }
  if (startIndex.x < 0 || startIndex.y < 0 || endIndex.x < 0 || endIndex.y < 0) return fallback

  const goal = { x: endStub.x, y: endStub.y }
  const startNode = nodeId(startIndex.x, startIndex.y)
  const goalNode = nodeId(endIndex.x, endIndex.y)

  const best = new Map<string, number>()
  const cameFrom = new Map<string, string>()
  const heap = new Heap()

  // State key includes the travel direction so a turn can be priced.
  const withDir = (node: string, dir: string): string => `${node}|${dir}`
  best.set(withDir(startNode, 'x'), 0)
  heap.push(0, 0, withDir(startNode, 'x'))

  const estimate = (point: Point): number => Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y)

  while (heap.size > 0) {
    const popped = heap.pop()!
    const state = popped.node
    const [node, dir] = state.split('|')
    const cost = best.get(state)
    if (cost === undefined) continue
    if (node === goalNode) {
      const path: Point[] = []
      let cursor: string | undefined = state
      while (cursor !== undefined) {
        const [cell] = cursor.split('|')
        path.push(pointAt(cell))
        cursor = cameFrom.get(cursor)
      }
      path.reverse()
      return simplify([start, startStub, ...path.slice(1), endStub, end])
    }
    const [ix, iy] = node.split(',').map(Number)
    const here = pointAt(node)

    const steps: { dx: number; dy: number; axis: 'x' | 'y' }[] = [
      { dx: 1, dy: 0, axis: 'x' },
      { dx: -1, dy: 0, axis: 'x' },
      { dx: 0, dy: 1, axis: 'y' },
      { dx: 0, dy: -1, axis: 'y' },
    ]
    for (const step of steps) {
      const nx = ix + step.dx
      const ny = iy + step.dy
      if (nx < 0 || ny < 0 || nx >= xCands.length || ny >= yCands.length) continue
      const next = { x: xCands[nx]!, y: yCands[ny]! }
      const nextNode = nodeId(nx, ny)
      if (nextNode !== goalNode && blocked.some(rect => insideStrict(rect, next))) continue

      const clear = step.axis === 'x'
        ? !hitsHorizontal(blocked, here.y, here.x, next.x)
        : !hitsVertical(blocked, here.x, here.y, next.y)
      if (!clear) continue

      const distance = Math.abs(next.x - here.x) + Math.abs(next.y - here.y)
      const onCorridor = step.axis === 'x'
        ? corridorY.has(Math.round(here.y))
        : corridorX.has(Math.round(here.x))
      const turn = dir === step.axis ? 0 : 18
      const prefer = onCorridor ? 0 : 6
      const nextCost = cost + distance + turn + prefer
      const nextState = withDir(nextNode, step.axis)
      const known = best.get(nextState)
      if (known !== undefined && known <= nextCost) continue
      best.set(nextState, nextCost)
      cameFrom.set(nextState, state)
      heap.push(nextCost + estimate(next), nextCost, nextState)
    }
  }

  return fallback
}

/** Orthogonal polyline → SVG path with rounded corners. */
export function roundedPath(points: Point[], radius = 10): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${round(points[0]!.x)} ${round(points[0]!.y)}`

  const parts = [`M ${round(points[0]!.x)} ${round(points[0]!.y)}`]
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1]!
    const here = points[index]!
    const next = points[index + 1]!
    const inLength = Math.hypot(here.x - prev.x, here.y - prev.y)
    const outLength = Math.hypot(next.x - here.x, next.y - here.y)
    const corner = Math.min(radius, inLength / 2, outLength / 2)
    if (corner < 0.5) {
      parts.push(`L ${round(here.x)} ${round(here.y)}`)
      continue
    }
    const enter = {
      x: here.x + ((prev.x - here.x) / (inLength || 1)) * corner,
      y: here.y + ((prev.y - here.y) / (inLength || 1)) * corner,
    }
    const leave = {
      x: here.x + ((next.x - here.x) / (outLength || 1)) * corner,
      y: here.y + ((next.y - here.y) / (outLength || 1)) * corner,
    }
    parts.push(`L ${round(enter.x)} ${round(enter.y)}`)
    parts.push(`Q ${round(here.x)} ${round(here.y)} ${round(leave.x)} ${round(leave.y)}`)
  }
  const last = points[points.length - 1]!
  parts.push(`L ${round(last.x)} ${round(last.y)}`)
  return parts.join(' ')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
