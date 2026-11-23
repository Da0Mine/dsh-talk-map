import fs from 'node:fs'
const f = 'scripts/_bench-drag.mjs'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('status-rail.open')) {
  t = t.replace(
    `  saved.cards = cards
  localStorage.setItem(key, JSON.stringify(saved))`,
    `  saved.cards = cards
  localStorage.setItem(key, JSON.stringify(saved))
  // 侧栏展开：玻璃层在场时测一次拖拽帧率
  localStorage.setItem('dsh.talk-map.status-rail.open.v1', '1')`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('bench: 侧栏默认展开')
}
