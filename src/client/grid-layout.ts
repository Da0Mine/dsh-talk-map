/**
 * Folder-style slot layout for the board.
 *
 * A workspace frame is a container, not a decoration: its rect is owned by the
 * user (drag the label to move it, drag the corner to resize it) and the cards
 * inside are laid out by THIS module into fixed slots, like home-screen icons.
 * Nothing here touches the store — every function is pure, so the invariants
 * ("never overlap", "reflow when the folder changes width", "compact when a
 * card leaves") are unit-testable without a browser.
 *
 * Coordinates are flow coordinates (the same space as Card.x/Card.y).
 */
import type { Card, FrameGeometry } from '../shared/model.ts'

export const CARD_W = 224
export const CARD_H = 120
export const GAP_X = 48
export const GAP_Y = 56
export const FRAME_PAD = 32
export const FRAME_LABEL_H = 30

/** Distance from the frame's top edge down to the first row of slots. */
const TOP_INSET = FRAME_PAD + FRAME_LABEL_H

/** A folder always fits at least one column. */
export const MIN_FRAME_WIDTH = CARD_W + FRAME_PAD * 2

export interface Point {
  x: number
  y: number
}

/** How many card columns fit in a frame of this width. */
export function colsForWidth(width: number): number {
  const usable = Math.max(CARD_W, width - FRAME_PAD * 2)
  return Math.max(1, Math.floor((usable + GAP_X) / (CARD_W + GAP_X)))
}

/** Top-left corner of slot `index` in a frame with this geometry. */
export function slotPoint(rect: FrameGeometry, index: number, cols = colsForWidth(rect.width)): Point {
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    x: rect.x + FRAME_PAD + col * (CARD_W + GAP_X),
    y: rect.y + TOP_INSET + row * (CARD_H + GAP_Y),
  }
}

/** Height a frame needs for `count` cards at `cols` columns (label band included). */
export function contentHeight(count: number, cols: number): number {
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / cols))
  return TOP_INSET + rows * CARD_H + (rows - 1) * GAP_Y + FRAME_PAD
}

/**
 * The rect a frame actually renders at. The stored rect is the user's wish;
 * a folder may be too small for its contents (a card was just dropped in, or
 * the session count grew), and then it grows — it never hides a card, and it
 * never shrinks below one column.
 */
export function frameRect(stored: FrameGeometry, count: number): FrameGeometry {
  const width = Math.max(MIN_FRAME_WIDTH, stored.width)
  const cols = colsForWidth(width)
  return {
    x: stored.x,
    y: stored.y,
    width,
    height: Math.max(stored.height, contentHeight(count, cols)),
  }
}

/** Reading order of the current arrangement: top row first, left to right. */
export function orderCards(entries: readonly (readonly [string, Card])[]): (readonly [string, Card])[] {
  return [...entries].sort((a, b) => (a[1].y - b[1].y) || (a[1].x - b[1].x) || a[0].localeCompare(b[0]))
}

/** Slot position for every member, in reading order. */
export function layoutFor(
  rect: FrameGeometry,
  entries: readonly (readonly [string, Card])[],
): Record<string, Point> {
  const cols = colsForWidth(rect.width)
  const out: Record<string, Point> = {}
  orderCards(entries).forEach(([cardId], index) => {
    out[cardId] = slotPoint(rect, index, cols)
  })
  return out
}

/**
 * Insertion index for a drop at `point`: which slot the dragged card would take
 * if it were dropped here. Clamped to `[0, count]` — dropping past the last
 * card means "append".
 */
export function dropIndex(rect: FrameGeometry, point: Point, count: number): number {
  const cols = colsForWidth(rect.width)
  const col = clamp(Math.round((point.x - rect.x - FRAME_PAD) / (CARD_W + GAP_X)), 0, cols - 1)
  const row = Math.max(0, Math.round((point.y - rect.y - TOP_INSET) / (CARD_H + GAP_Y)))
  return clamp(row * cols + col, 0, count)
}

/** True when a card's top-left sits on the slot it should occupy. */
export function isPlaced(point: Point | undefined, card: Card): boolean {
  return point !== undefined && point.x === card.x && point.y === card.y
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
