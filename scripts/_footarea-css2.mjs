import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const sel of ['_footArea{', '_footerActions{', '_settingsArea{']) {
  const at = s.indexOf(sel)
  if (at < 0) { console.log(sel, 'not found'); continue }
  const start = s.lastIndexOf('.', at)
  const end = s.indexOf('}', at)
  console.log(sel, '→', s.slice(start, end + 1))
}
