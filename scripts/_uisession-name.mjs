import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('var UiSession=class extends')
const seg = s.slice(at, at + 1400)
console.log(seg.replace(/\s+/g, ' ').slice(0, 1300))
