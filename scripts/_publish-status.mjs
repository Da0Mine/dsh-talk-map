import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('publishStatus(){')
if (at < 0) { console.log('publishStatus not found'); process.exit(1) }
console.log(s.slice(at, at + 900).replace(/\s+/g, ' '))
