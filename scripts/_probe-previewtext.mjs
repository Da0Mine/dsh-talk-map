import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const at of [69941963, 69944030, 73946112]) {
  console.log('=== at', at)
  console.log(s.slice(at - 420, at + 260).replace(/\s+/g, ' '))
  console.log()
}
