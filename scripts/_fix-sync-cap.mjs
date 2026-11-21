import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split('\n')
// syncGroup 的 fresh：找到紧跟 "const fresh = placeableSessionIds" 的 sort 行，补 slice
const freshAt = lines.findIndex(l => l.includes('const fresh = placeableSessionIds(sessions, archivedSessionIds)'))
if (freshAt < 0) throw new Error('fresh missing')
let sortAt = freshAt
while (sortAt < freshAt + 5 && !lines[sortAt].includes('.sort(')) sortAt += 1
if (!lines[sortAt].includes('.slice(0, IMPORT_CAP)')) {
  const indent = lines[sortAt].match(/^\s*/)[0]
  lines.splice(sortAt + 1, 0, indent + '  .slice(0, IMPORT_CAP)')
  console.log('syncGroup: slice added at line', sortAt + 2)
}
fs.writeFileSync(f, lines.join('\n'), 'utf8')
