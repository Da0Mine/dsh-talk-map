import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(`                {recentRowsOrdered.map((row) => (`, `                {unpinnedRecentRows.map((row) => (`)
t = t.replace(`              {recentRows.length > 0`, `              {unpinnedRecentRows.length > 0`)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 最近区只放未置顶')
