import fs from 'node:fs'
const file = 'src/client/i18n.ts'
let text = fs.readFileSync(file, 'utf8')
text = text.replace("'statusRail.title': '有状态的卡片'", "'statusRail.title': '队列中的任务'")
text = text.replace("'statusRail.title': 'Cards with a status'", "'statusRail.title': 'Tasks in the queue'")
fs.writeFileSync(file, text, 'utf8')
console.log('title updated')
