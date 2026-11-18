import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('var UiSession=class extends')
const seg = s.slice(at, at + 6000)
// 列出类里定义的方法名
const methods = [...seg.matchAll(/([A-Za-z][A-Za-z0-9_]{2,}=\([^)]*\)=>|^\s*([A-Za-z][A-Za-z0-9_]{2,})\()/g)]
  .map(m => m[1])
const named = [...seg.matchAll(/([A-Za-z][A-Za-z0-9_]*)=(\(|async \()/g)].map(m => m[1])
console.log('候选成员:', JSON.stringify([...new Set(named)].slice(0, 60)))
const readAt = seg.indexOf('completionUnread.delete')
console.log('\n清除点上下文:', seg.slice(Math.max(0, readAt - 260), readAt + 120).replace(/\s+/g, ' '))
