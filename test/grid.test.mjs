/**
 * Pure-function checks for the slot layout (no browser, no build):
 *   node --experimental-strip-types test/grid.test.mjs
 *
 * These are the invariants the UI relies on — fixed slots, no overlap, newest
 * first, reflow on width change, compaction when a card leaves.
 */
import assert from 'node:assert/strict'
import {
  CARD_H, CARD_W, GAP_X, GAP_Y, MIN_FRAME_WIDTH,
  colsForWidth, contentHeight, frameRect, layoutFor, orderByTime, slotIndexAt, slotPoint,
} from '../src/client/grid-layout.ts'

const rect = (width, count, x = 0, y = 0) => frameRect({ x, y, width, height: contentHeight(count, colsForWidth(width)) }, count)
const entry = (cardId, time) => ({ cardId, time })

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

ok('order is newest first, ties stable by id', () => {
  const entries = [entry('b', 100), entry('a', 300), entry('d', 200), entry('c', 200)]
  assert.deepEqual(orderByTime(entries).map(e => e.cardId), ['a', 'c', 'd', 'b'])
})

ok('the newest card owns the first slot (leftmost, top row)', () => {
  const geometry = rect(832, 4)
  const layout = layoutFor(geometry, [
    entry('old', 10), entry('newest', 900), entry('mid', 500), entry('third', 300),
  ])
  const first = slotPoint(geometry, 0)
  assert.deepEqual(layout['newest'], first)
  assert.equal(layout['mid'].x, first.x + CARD_W + GAP_X, 'second newest sits to its right')
  assert.equal(layout['third'].x, first.x + 2 * (CARD_W + GAP_X), 'third one further right')
  assert.equal(layout['old'].y, first.y + CARD_H + GAP_Y, 'the oldest wraps to the next row')
})

ok('a wider folder reflows the same order into more columns', () => {
  const members = [entry('a', 500), entry('b', 400), entry('c', 300), entry('d', 200), entry('e', 100)]
  const narrow = layoutFor(rect(MIN_FRAME_WIDTH, 5), members)
  const wide = layoutFor(rect(832, 5), members)
  assert.equal(narrow.b.x, narrow.a.x, 'one column: b sits under a')
  assert.equal(narrow.b.y, narrow.a.y + CARD_H + GAP_Y)
  assert.equal(wide.b.y, wide.a.y, 'three columns: b sits beside a')
  assert.equal(wide.b.x, wide.a.x + CARD_W + GAP_X)
  assert.deepEqual(Object.keys(narrow).sort(), Object.keys(wide).sort())
})

ok('removing the newest card pulls everyone forward', () => {
  const geometry = rect(832, 4)
  const before = layoutFor(geometry, [entry('a', 500), entry('b', 400), entry('c', 300)])
  const after = layoutFor(geometry, [entry('b', 400), entry('c', 300)])
  assert.deepEqual(after['b'], before['a'], 'the survivor takes the freed first slot')
  assert.deepEqual(after['c'], before['b'])
})

ok('a refreshed session moves to the front', () => {
  const geometry = rect(832, 3)
  const before = layoutFor(geometry, [entry('a', 900), entry('b', 800), entry('c', 100)])
  const after = layoutFor(geometry, [entry('a', 900), entry('b', 800), entry('c', 1000)])
  assert.deepEqual(before['c'], slotPoint(geometry, 2))
  assert.deepEqual(after['c'], slotPoint(geometry, 0), 'c just ran, so it takes the first slot')
})

ok('slotIndexAt maps a point to the slot under it', () => {
  const geometry = rect(832, 5)
  assert.equal(slotIndexAt(geometry, { x: geometry.x + 40, y: geometry.y + 70 }), 0)
  const second = slotIndexAt(geometry, { x: geometry.x + 32 + CARD_W + GAP_X + 10, y: geometry.y + 62 + 10 })
  assert.equal(second, 1)
  assert.equal(slotIndexAt(geometry, { x: geometry.x + 40, y: geometry.y + 62 + CARD_H + GAP_Y + 10 }), 3, 'next row')
})

ok('a folder never renders narrower than one column nor shorter than its cards', () => {
  const tiny = frameRect({ x: 0, y: 0, width: 40, height: 10 }, 4)
  assert.equal(tiny.width, MIN_FRAME_WIDTH)
  assert.ok(tiny.height >= contentHeight(4, 1))
})

console.log(`\ngrid-layout: ${checks} checks passed`)
