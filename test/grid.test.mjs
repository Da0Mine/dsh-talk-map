/**
 * Pure-function checks for the slot layout (no browser, no build):
 *   node --experimental-strip-types test/grid.test.mjs
 *
 * These are the invariants the UI relies on — fixed slots, no overlap, reflow on
 * width change, compaction when a card leaves, clamp-safe drops.
 */
import assert from 'node:assert/strict'
import {
  CARD_H, CARD_W, GAP_X, GAP_Y, MIN_FRAME_WIDTH,
  colsForWidth, contentHeight, dropIndex, frameRect, layoutFor, orderCards, slotPoint,
} from '../src/client/grid-layout.ts'

const card = (id, x, y) => ({ boardId: 'inbox', sessionId: id, x, y, createdAt: 0 })
const rect = (width, count, x = 0, y = 0) => frameRect({ x, y, width, height: contentHeight(count, colsForWidth(width)) }, count)

let checks = 0
function ok(name, fn) {
  fn()
  checks += 1
  console.log(`  ok ${name}`)
}

ok('columns follow width', () => {
  assert.equal(colsForWidth(MIN_FRAME_WIDTH), 1)
  assert.equal(colsForWidth(MIN_FRAME_WIDTH + CARD_W + GAP_X), 2)
  assert.equal(colsForWidth(832), 3)
  assert.equal(colsForWidth(1248), 4)
  assert.equal(colsForWidth(10), 1, 'a tiny folder still fits one column')
})

ok('slots never overlap, for any count and width', () => {
  for (const width of [MIN_FRAME_WIDTH, 560, 832, 1248, 2000]) {
    for (const count of [1, 2, 3, 5, 8, 13]) {
      const geometry = rect(width, count)
      const cols = colsForWidth(geometry.width)
      const points = Array.from({ length: count }, (_, i) => slotPoint(geometry, i, cols))
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const a = points[i], b = points[j]
          const overlap = a.x < b.x + CARD_W && b.x < a.x + CARD_W && a.y < b.y + CARD_H && b.y < a.y + CARD_H
          assert.equal(overlap, false, `overlap at ${width}px / ${count} cards: ${i}-${j}`)
        }
      }
      // every slot stays inside the folder box
      const last = points.at(-1)
      assert.ok(last.x + CARD_W <= geometry.x + geometry.width, 'slot overflows folder width')
      assert.ok(last.y + CARD_H <= geometry.y + geometry.height, 'slot overflows folder height')
    }
  }
})

ok('height grows with rows, never below one row', () => {
  const rowHeight = CARD_H + GAP_Y
  assert.equal(contentHeight(3, 3), contentHeight(1, 3), 'three cards in three columns need one row')
  assert.equal(contentHeight(4, 3), contentHeight(1, 3) + rowHeight, 'the fourth card starts a new row')
  assert.equal(contentHeight(4, 1) - contentHeight(3, 1), rowHeight, 'one column grows a row per card')
  assert.equal(contentHeight(0, 3), contentHeight(1, 3), 'an empty folder keeps one row')
})

ok('reading order is row-major', () => {
  const entries = [
    ['d', card('d', 0, 200)],
    ['b', card('b', 300, 0)],
    ['a', card('a', 0, 0)],
    ['c', card('c', 300, 200)],
  ]
  assert.deepEqual(orderCards(entries).map(([id]) => id), ['a', 'b', 'd', 'c'])
})

ok('a wider folder reflows the same order into more columns', () => {
  const members = ['a', 'b', 'c', 'd', 'e'].map((id, i) => [id, card(id, (i % 2) * 300, Math.floor(i / 2) * 200)])
  const narrow = layoutFor(rect(MIN_FRAME_WIDTH, 5), members)
  const wide = layoutFor(rect(832, 5), members)
  assert.equal(narrow.b.x, narrow.a.x, 'one column: b sits under a')
  assert.equal(narrow.b.y, narrow.a.y + CARD_H + GAP_Y)
  assert.equal(wide.b.y, wide.a.y, 'three columns: b sits beside a')
  assert.equal(wide.b.x, wide.a.x + CARD_W + GAP_X)
  assert.deepEqual(Object.keys(narrow).sort(), Object.keys(wide).sort())
})

ok('removing a card closes the gap', () => {
  const members = ['a', 'b', 'c', 'd'].map((id, i) => [id, card(id, i * 300, 0)])
  const five = layoutFor(rect(832, 4), [...members, ['e', card('e', 4 * 300, 0)]])
  const four = layoutFor(rect(832, 4), members)
  assert.equal(five.c.x, 2 * (CARD_W + GAP_X) + 32)
  assert.equal(four.c.x, five.c.x, 'c keeps its slot when e leaves')
})

ok('drop index is clamped to the folder', () => {
  const geometry = rect(832, 5)
  assert.equal(dropIndex(geometry, { x: geometry.x + 40, y: geometry.y + 70 }, 5), 0, 'top-left slot')
  assert.equal(dropIndex(geometry, { x: geometry.x - 500, y: geometry.y - 500 }, 5), 0)
  assert.equal(dropIndex(geometry, { x: geometry.x + 5000, y: geometry.y + 5000 }, 5), 5, 'past the end appends')
  const second = dropIndex(geometry, { x: geometry.x + 32 + CARD_W + GAP_X + 10, y: geometry.y + 62 + 10 }, 5)
  assert.equal(second, 1)
})

ok('a folder never renders narrower than one column nor shorter than its cards', () => {
  const tiny = frameRect({ x: 0, y: 0, width: 40, height: 10 }, 4)
  assert.equal(tiny.width, MIN_FRAME_WIDTH)
  assert.ok(tiny.height >= contentHeight(4, 1))
})

console.log(`\ngrid-layout: ${checks} checks passed`)
