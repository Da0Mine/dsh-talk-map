import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const needle of ['"sidebar.workspaces"', 'sidebar.workspaces:']) {
  let at = s.indexOf(needle)
  if (at < 0) { console.log(needle, 'not found'); continue }
  console.log('====', needle, 'at', at)
  console.log(s.slice(Math.max(0, at - 500), at + 700).replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').slice(0, 1100))
  console.log()
}
