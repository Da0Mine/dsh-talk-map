import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runLimited, createPreviewCache } from '../src/host/preview.ts'

test('runLimited never exceeds the limit and covers every item', async () => {
  const seen = []
  let active = 0
  let peak = 0
  await runLimited(Array.from({ length: 10 }, (_, i) => i), 2, async (item) => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise(r => setTimeout(r, 5))
    seen.push(item)
    active -= 1
  })
  assert.equal(peak, 2, `peak concurrency ${peak}`)
  assert.deepEqual(seen.sort((a, b) => a - b), [0,1,2,3,4,5,6,7,8,9])
})

test('runLimited handles an empty list and limit larger than items', async () => {
  await runLimited([], 4, async () => { throw new Error('should not run') })
  let count = 0
  await runLimited([1, 2], 8, async () => { count += 1 })
  assert.equal(count, 2)
})

test('preview cache returns entries by stamp and evicts the oldest', () => {
  const cache = createPreviewCache(2)
  cache.set('a', { stamp: 1, text: 'A' })
  cache.set('b', { stamp: 2, text: 'B' })
  assert.equal(cache.get('a').text, 'A')
  cache.set('c', { stamp: 3, text: 'C' })   // 'b' is the LRU now
  assert.equal(cache.get('b'), undefined)
  assert.equal(cache.get('a').text, 'A')
  assert.equal(cache.size, 2)
})
