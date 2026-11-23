import fs from 'node:fs'
const f = 'scripts/_bench-drag.mjs'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('heapMB')) {
  t = t.replace(
    `  domNodes: document.getElementsByTagName('*').length,`,
    `  domNodes: document.getElementsByTagName('*').length,
  heapMB: performance.memory === undefined ? null : Math.round(performance.memory.usedJSHeapSize / 1048576),`,
  )
  t = t.replace(`  domNodes: before.domNodes,`, `  domNodes: before.domNodes,
  heapMB: before.heapMB,`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('bench: heap 已加入输出')
}
