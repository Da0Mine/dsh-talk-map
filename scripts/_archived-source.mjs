import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const needle of ['archivedSessionIds']) {
  let idx = 0, n = 0
  while (n < 4) {
    idx = s.indexOf(needle, idx + 1)
    if (idx < 0) break
    const seg = s.slice(Math.max(0, idx - 320), idx + 160).replace(/\s+/g, ' ')
    if (seg.includes('getSnapshot') || seg.includes('list:') || seg.includes('class')) { console.log('----', idx); console.log(seg); n += 1 }
  }
}
