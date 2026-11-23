import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const n of ['--dsw-alias-border-secondary', '--dsw-alias-border-l2', '--dsw-alias-border-l1']) {
  const i = s.indexOf(n + ':')
  console.log(n, i < 0 ? '❌ 不存在' : '✅ ' + s.slice(i, i + 50).replace(/\s+/g, ' '))
}
