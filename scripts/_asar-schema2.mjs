import fs from 'node:fs'
const buf = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar')
const s = buf.toString('utf8')
const grab = (needle, before = 120, after = 320) => {
  const at = s.indexOf(needle)
  if (at < 0) return needle + ' :: not found'
  return s.slice(Math.max(0, at - before), at + after).replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ')
}
console.log('A) zDeleteSessionRequest =', grab('zDeleteSessionRequest =', 40, 200))
console.log('\nB) workspace/delete =', grab('"workspace/delete": {', 20, 420))
console.log('\nC) WorkspaceDelete =', grab('deleteWorkspace', 200, 260))
