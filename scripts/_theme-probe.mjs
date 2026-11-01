/** 从 app.asar 里抽 DSH 暗色主题的真实 token 值。 */
import fs from 'node:fs'

const text = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('latin1')

const wanted = [
  'label-primary', 'label-secondary', 'label-tertiary', 'label-quaternary',
  'border-l1', 'border-l2', 'border-l3',
  'brand-primary', 'bg-input', 'bg-base', 'bg-layer-1', 'bg-layer-2', 'bg-layer-3',
  'interactive-bg-hover', 'interactive-bg-active',
]

let found = 0
for (const key of wanted) {
  const needle = `--dsw-alias-${key}:`
  let idx = 0
  let hits = 0
  while ((idx = text.indexOf(needle, idx + 1)) > 0 && hits < 4) {
    const value = text.slice(idx + needle.length, idx + needle.length + 80).split(';')[0].trim()
    // 往前找这个声明所在规则块的选择器
    const before = text.slice(Math.max(0, idx - 4000), idx)
    const brace = before.lastIndexOf('{')
    const head = before.slice(Math.max(0, brace - 160), brace).replace(/\s+/g, ' ').trim()
    const selector = head.slice(head.lastIndexOf('}') + 1).slice(-90)
    console.log(`${key} #${++hits}  ${value.slice(0, 60)}`)
    console.log(`   in: ${selector}`)
    found++
  }
}
console.log('total', found)
