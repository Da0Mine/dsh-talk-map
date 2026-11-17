import fs from 'node:fs'
const buf = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar')
const s = buf.toString('utf8')
const found = new Set()
for (const m of s.matchAll(/["'`](sidebar\.[a-zA-Z.]*)["'`]/g)) found.add(m[1])
console.log('sidebar.* 插槽名:', JSON.stringify([...found].sort()))
const found2 = new Set()
for (const m of s.matchAll(/name:\s*["'](sidebar\.[^"']+)["']/g)) found2.add(m[1])
console.log('name: sidebar.* 注册:', JSON.stringify([...found2].sort()))
