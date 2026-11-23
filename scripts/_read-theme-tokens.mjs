import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const names = ['--dsw-alias-bg-elevated', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-base', '--dsw-alias-bg-layer-2']
for (const name of names) {
  let i = -1; const hits = []
  while (hits.length < 6) { i = s.indexOf(name + ':', i + 1); if (i < 0) break; hits.push(s.slice(i, i + 60).replace(/\s+/g, ' ')) }
  console.log('===', name)
  for (const h of hits) console.log('   ', h)
}
