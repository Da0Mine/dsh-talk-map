import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const needle of ['sidebar.footer.action']) {
  let idx = 0, n = 0
  while (n < 8) {
    idx = s.indexOf(needle, idx + 1)
    if (idx < 0) break
    const seg = s.slice(Math.max(0, idx - 300), idx + 200).replace(/\s+/g, ' ')
    if (seg.includes('renderSlot') || seg.includes('slots.render')) { console.log('---- 渲染点', idx); console.log(seg); n += 1 }
  }
}
