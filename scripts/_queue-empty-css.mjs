import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('.sidebarQueueEmpty {')) {
  t += `
/* Empty state inside the sidebar queue board (it used to unmount instead). */
.sidebarQueueEmpty {
  padding: 6px 4px 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: .sidebarQueueEmpty')
}
