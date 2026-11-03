import fs from 'node:fs'
const file = 'D:/DeepSeek Harness/resources/app.asar'
const buf = fs.readFileSync(file)
const needles = ['session/delete', 'deleteSession', 'session/remove', 'removeSession', 'workspace/delete', 'deleteWorkspace', 'session-recycle-bin', 'workspaceRegistry.deleteSession', 'sessionPersistence.remove']
for (const needle of needles) {
  const hits = []
  let at = 0
  while (hits.length < 3) {
    const index = buf.indexOf(needle, at, 'utf8')
    if (index < 0) break
    hits.push(index)
    at = index + 1
  }
  let sample = ''
  if (hits.length > 0) {
    const from = Math.max(0, hits[0] - 60)
    sample = buf.slice(from, hits[0] + 120).toString('utf8').replace(/[^\x20-\x7e\u4e00-\u9fa5]/g, ' ')
  }
  console.log(`${needle.padEnd(30)} hits=${hits.length}${hits.length > 0 ? '  …' + sample.slice(0, 150) : ''}`)
}
