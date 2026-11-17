import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('.Fu0XRq_footerButtons')
console.log('=== CSS 邻域 ===')
console.log(s.slice(Math.max(0, at - 900), at + 700).replace(/\s+/g, ' '))
