import fs from 'node:fs'
const buf = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar')
for (const needle of ['zDeleteWorkspaceRequest', 'zDeleteSessionRequest', 'zListWorkspacesRequest']) {
  const at = buf.indexOf(needle, 0, 'utf8')
  if (at < 0) { console.log(needle, 'not found'); continue }
  const text = buf.slice(at - 200, at + 400).toString('utf8').replace(/[^\x20-\x7e]/g, ' ')
  console.log('==== ' + needle + '\n' + text.replace(/\s+/g, ' ').slice(0, 560) + '\n')
}
