/**
 * Which faces of two cards an edge joins.
 *
 * Cards in a folder sit one grid gap apart (~12px), so a facing-side connection
 * between neighbours is a stub that cannot be seen — and two edges drawn that way
 * overlap on the same short segment. The rule:
 *
 *   1. Use the facing sides when the clearance between them is long enough.
 *   2. Otherwise leave through the free top/bottom (or left/right) face and come
 *      back in, so the line loops with real length.
 *   3. "Free" means no other card within about one card size in that direction,
 *      so the loop does not run through the neighbour.
 *
 * Pure on purpose: it is the piece worth testing, and the canvas is not.
 */
export type Side = 't' | 'r' | 'b' | 'l'

export interface PlacedRect {
  x: number
  y: number
}

export interface RoutingOptions {
  cardWidth: number
  cardHeight: number
  /** Clearance below which a facing-side line counts as a stub. */
  minSpan?: number
}

/** Cards that may block a loop, given the two endpoints. */
export type Obstacle = PlacedRect & { id: string }

const DEFAULT_MIN_SPAN = 96

function overlapsSpan(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) < tolerance
}

/** Is something sitting within one card-size of `card` on that side? */
export function blockedToward(
  card: PlacedRect & { id: string },
  side: Side,
  obstacles: readonly Obstacle[],
  size: { width: number; height: number },
): boolean {
  const vertical = side === 'b' || side === 't'
  for (const other of obstacles) {
    if (other.id === card.id) continue
    const dx = other.x - card.x
    const dy = other.y - card.y
    if (vertical) {
      // Same column (roughly) and close in the direction asked about.
      if (!overlapsSpan(dx, 0, size.width * 0.9)) continue
      if (side === 'b' && dy > 0 && dy < size.height * 1.15) return true
      if (side === 't' && dy < 0 && -dy < size.height * 1.15) return true
    } else {
      if (!overlapsSpan(dy, 0, size.height * 0.9)) continue
      if (side === 'r' && dx > 0 && dx < size.width * 1.15) return true
      if (side === 'l' && dx < 0 && -dx < size.width * 1.15) return true
    }
  }
  return false
}

export interface FacePair {
  fromHandle: Side
  toHandle: Side
}

/**
 * Faces for an edge from `from` to `to`.
 *
 * `obstacles` should include the two endpoints (their own ids are skipped).
 */
export function pickFaces(
  from: PlacedRect & { id: string },
  to: PlacedRect & { id: string },
  obstacles: readonly Obstacle[],
  options: RoutingOptions,
): FacePair {
  const minSpan = options.minSpan ?? DEFAULT_MIN_SPAN
  const size = { width: options.cardWidth, height: options.cardHeight }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const gapX = Math.abs(dx) - options.cardWidth
  const gapY = Math.abs(dy) - options.cardHeight
  const horizontalDominant = Math.abs(dx) >= Math.abs(dy)

  if (horizontalDominant) {
    if (gapX >= minSpan) {
      return dx >= 0 ? { fromHandle: 'r', toHandle: 'l' } : { fromHandle: 'l', toHandle: 'r' }
    }
    // Side by side and too tight: loop through a free horizontal face.
    const fromSide: Side = blockedToward(from, 'b', obstacles, size)
      && !blockedToward(from, 't', obstacles, size) ? 't' : 'b'
    const toSide: Side = blockedToward(to, 'b', obstacles, size)
      && !blockedToward(to, 't', obstacles, size) ? 't' : 'b'
    return { fromHandle: fromSide, toHandle: toSide }
  }

  if (gapY >= minSpan) {
    return dy >= 0 ? { fromHandle: 'b', toHandle: 't' } : { fromHandle: 't', toHandle: 'b' }
  }
  const fromSide: Side = blockedToward(from, 'r', obstacles, size)
    && !blockedToward(from, 'l', obstacles, size) ? 'l' : 'r'
  const toSide: Side = blockedToward(to, 'r', obstacles, size)
    && !blockedToward(to, 'l', obstacles, size) ? 'l' : 'r'
  return { fromHandle: fromSide, toHandle: toSide }
}
