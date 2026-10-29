/** Insert the perf checks before the hover block, and assert the lazy fetch. */
import fs from 'node:fs'

const probe = 'test/probe.mjs'
const lines = fs.readFileSync(probe, 'utf8').split('\n')
const block = fs.readFileSync('scripts/_probe-perf.txt', 'utf8').replace(/\n$/, '').split('\n')

// 1) before the hover comment
const at = lines.findIndex(line => line.includes('Hovering a hit reveals the whole passage'))
if (at < 0) {
  console.error('hover marker not found')
  process.exit(1)
}
let next = [...lines.slice(0, at), ...block, ...lines.slice(at)]

// 2) after the peek assertion, assert the passage was fetched on hover
const peekAt = next.findIndex(line => line.includes("check('悬停后弹出框显示更多上下文'"))
if (peekAt < 0) {
  console.error('peek check not found')
  process.exit(1)
}
let peekEnd = peekAt
while (peekEnd < next.length && !next[peekEnd].trim().endsWith('JSON.stringify(peekBox))')) peekEnd += 1
const extra = [
  '    const contextCallsAfterHover = await page.evaluate(() => window.__harness.searchContextCalls())',
  '    check(\'悬停时才去取这一段原文\', contextCallsAfterHover.length >= 1,',
  '      JSON.stringify(contextCallsAfterHover))',
  '    check(\'取回来的上下文比单行多（≥3 行）\',',
  '      (peekBox?.lines ?? 0) >= 3, JSON.stringify(peekBox))',
]
next = [...next.slice(0, peekEnd + 1), ...extra, ...next.slice(peekEnd + 1)]

fs.writeFileSync(probe, next.join('\n'), 'utf8')
console.log('perf checks inserted')
