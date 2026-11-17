import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
let idx = 0, n = 0
while (n < 4) {
  idx = s.indexOf('footerBar', idx + 1)
  if (idx < 0) break
  const seg = s.slice(Math.max(0, idx - 500), idx + 420).replace(/\s+/g, ' ')
  console.log('----', idx)
  console.log(seg)
  n += 1
}
