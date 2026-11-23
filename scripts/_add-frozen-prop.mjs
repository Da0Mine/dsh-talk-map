import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.trim() === 'onOpen={openRailCard}' && lines[lines.indexOf(l) + 1]?.trim() === '/>')
if (at < 0) {
  // 退一步：找 <StatusRail 后面的 onOpen 行
  const railAt = lines.findIndex(l => l.trim() === '<StatusRail')
  const openAt = lines.findIndex((l, i) => i > railAt && l.trim() === 'onOpen={openRailCard}')
  if (openAt < 0) throw new Error('onOpen line not found')
  lines.splice(openAt + 1, 0, '        frozen={railFrozen}')
} else {
  lines.splice(at + 1, 0, '        frozen={railFrozen}')
}
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('frozen prop 已插入')
