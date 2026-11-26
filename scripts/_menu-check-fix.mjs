import fs from 'node:fs'
const f = 'scripts/_drag-menu-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(`const el = document.querySelector('[class*="railMenu"]')`, `const el = document.querySelector('[role="menu"]')`)
fs.writeFileSync(f, t, 'utf8')
console.log('检查脚本改用 role=menu')
