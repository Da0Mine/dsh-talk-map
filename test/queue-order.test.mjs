/**
 * Unit test for the shared queue ordering: the priority ladder and the tie-break.
 * Run: node test/queue-order.test.mjs
 */
import assert from 'node:assert/strict'
import { compareQueueRows, queueRank, sortQueueRows } from '../src/client/queue-order.ts'

let passed = 0
const check = (name, fn) => {
  fn()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

check('优先级阶梯：异常终止 > 等待回答 > 待查看 > 正在运行 > 待发送', () => {
  assert.equal(queueRank('error', false), 0)
  assert.equal(queueRank('waiting', false), 1)
  assert.equal(queueRank('done', false), 2)
  assert.equal(queueRank('running', false), 3)
  assert.equal(queueRank(undefined, true), 4)
})

check('整队排序：不分时间先后，只按优先级分组', () => {
  const rows = [
    { id: 'draft-new', draft: true, updatedAt: 900 },
    { id: 'running-old', lamp: 'running', updatedAt: 100 },
    { id: 'done-new', lamp: 'done', updatedAt: 800 },
    { id: 'waiting-old', lamp: 'waiting', updatedAt: 200 },
    { id: 'error-oldest', lamp: 'error', updatedAt: 50 },
    { id: 'done-old', lamp: 'done', updatedAt: 300 },
  ]
  assert.deepEqual(sortQueueRows(rows).map(row => row.id), [
    'error-oldest', 'waiting-old', 'done-new', 'done-old', 'running-old', 'draft-new',
  ])
})

check('同一优先级内部：时间新的在前', () => {
  const rows = [
    { id: 'a', lamp: 'done', updatedAt: 100 },
    { id: 'b', lamp: 'done', updatedAt: 500 },
    { id: 'c', lamp: 'done', updatedAt: 300 },
  ]
  assert.deepEqual(sortQueueRows(rows).map(row => row.id), ['b', 'c', 'a'])
})

check('手动拖拽只在同组内生效，不能跨优先级', () => {
  const rows = [
    { id: 'done-old', lamp: 'done', updatedAt: 300, manualIndex: 0 },
    { id: 'error', lamp: 'error', updatedAt: 10, manualIndex: 9 },
    { id: 'done-new', lamp: 'done', updatedAt: 800, manualIndex: 1 },
  ]
  // error 仍排第一（优先级更高），done 组内按手动序：done-old 先
  assert.deepEqual(sortQueueRows(rows).map(row => row.id), ['error', 'done-old', 'done-new'])
})

check('compare 自反/对称', () => {
  const a = { lamp: 'done', updatedAt: 5 }
  const b = { lamp: 'running', updatedAt: 99 }
  assert.equal(Math.sign(compareQueueRows(a, b)), -Math.sign(compareQueueRows(b, a)))
  assert.equal(compareQueueRows(a, a), 0)
})

console.log(`\n${passed}/5 checks passed`)
