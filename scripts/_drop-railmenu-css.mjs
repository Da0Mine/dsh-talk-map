import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const start = t.indexOf('/* Right-click menu for queue cards (both rails). */')
if (start >= 0) {
  const end = t.indexOf('.railMenuItemDanger {')
  const tail = end >= 0 ? t.indexOf('}', end) + 1 : t.length
  t = t.slice(0, start).trimEnd() + '\n' + t.slice(tail).replace(/^\s*\n/, '')
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 移除临时 railMenu 样式（改复用 .menu）')
}
