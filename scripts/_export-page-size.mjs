import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(`/** How many of them are on screen before「查看更多」. */\nconst RECENT_PAGE_SIZE = 5`,
  `/** How many of them are on screen before「查看更多」. */\nexport const RECENT_PAGE_SIZE = 5`)
fs.writeFileSync(f, t, 'utf8')
console.log('导出 RECENT_PAGE_SIZE')
