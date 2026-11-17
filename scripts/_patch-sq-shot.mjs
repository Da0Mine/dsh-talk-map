import fs from 'node:fs'
const file = 'scripts/_sidebar-queue-check.mjs'
let text = fs.readFileSync(file, 'utf8')
if (!text.includes('--shot')) {
  text = text.replace(
    "console.log('errors:', JSON.stringify(errors))",
    `const shot = process.argv.includes('--shot') ? process.argv[process.argv.indexOf('--shot') + 1] : 'test/shots/sidebar-queue.png'
await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 260, height: 760 } })
console.log('shot:', shot)
console.log('errors:', JSON.stringify(errors))`,
  )
}
fs.writeFileSync(file, text, 'utf8')
console.log('shot added')
