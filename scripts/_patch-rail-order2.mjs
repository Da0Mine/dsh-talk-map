import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let lines = fs.readFileSync(file, 'utf8').split('\n')

// 1) 移除误插的 4 行（以 statusRailHead 开头的那块）
const bad = lines.findIndex(l => l.includes("styles['statusRailHead']"))
if (bad < 0) { console.log('head block missing'); process.exit(1) }
const block = lines.slice(bad, bad + 4)
if (!block[1].includes('statusRailTitle') || !block[3].trim().startsWith('</div>')) {
  console.log('unexpected block:', block)
  process.exit(1)
}
lines.splice(bad, 4)
console.log('移除误插块 @', bad + 1)

// 2) 精确插到 statusRailList 之前
const listAt = lines.findIndex(l => l.includes("styles['statusRailList']") && l.includes('role="list"'))
if (listAt < 0) { console.log('list not found'); process.exit(1) }
lines.splice(listAt, 0, ...block)
console.log('插入到 statusRailList 之前 @', listAt + 1)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
