import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split('\n')
let removed = 0
const kept = lines.filter(l => {
  if (l.includes('railGlass.thaw()') || l.includes('railGlass.freeze()')) { removed += 1; return false }
  return true
})
fs.writeFileSync(f, kept.join('\n'), 'utf8')
console.log('移除残余调用:', removed)
