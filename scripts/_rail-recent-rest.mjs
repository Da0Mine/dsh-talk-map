import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
// 最近区只渲染未置顶的
t = t.replace(`                {recentEntriesOrdered.map(entry => {`, `                {unpinnedRecentEntries.map(entry => {`)
t = t.replace(`          {props.recent !== undefined && props.recent.length > 0`, `          {props.recent !== undefined && unpinnedRecentEntries.length > 0`)
fs.writeFileSync(f, t, 'utf8')
console.log('StatusRail: 最近区只放未置顶')
