import fs from 'node:fs'
const buf = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar')
const s = buf.toString('utf8')
const grab = (needle, before = 80, after = 260) => {
  const at = s.indexOf(needle)
  if (at < 0) return `${needle} :: not found`
  return s.slice(Math.max(0, at - before), at + after).replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ')
}
for (const needle of ['compaction/compact', 'session/compact', 'compactionService', 'ctx.compaction', 'compactSession']) {
  console.log('==== ' + needle)
  console.log(grab(needle).slice(0, 300))
}
