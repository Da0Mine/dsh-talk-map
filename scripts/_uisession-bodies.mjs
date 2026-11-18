import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const key of ['publishMain(){', 'isMain(sessionId){', 'reconcileStatus(){']) {
  const i = s.indexOf(key)
  if (i < 0) { console.log(key, '未找到'); continue }
  console.log('====', key)
  console.log(s.slice(i, i + 560).replace(/\s+/g, ' '))
  console.log()
}
