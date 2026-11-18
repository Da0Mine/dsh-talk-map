import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const needle of ['useSessionStatus', 'completionUnread']) {
  let idx = 0, n = 0
  while (n < 3) {
    idx = s.indexOf(needle, idx + 1)
    if (idx < 0) break
    console.log('----', needle, idx)
    console.log(s.slice(Math.max(0, idx - 420), idx + 260).replace(/\s+/g, ' ').slice(0, 620))
    n += 1
  }
  console.log()
}
