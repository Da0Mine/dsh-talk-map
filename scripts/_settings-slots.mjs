import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const names = new Set()
for (const m of s.matchAll(/name:\s*[`"'](settings\.[a-zA-Z.]+)[`"']/g)) names.add(m[1])
console.log('settings.* 槽名:', JSON.stringify([...names].sort()))
