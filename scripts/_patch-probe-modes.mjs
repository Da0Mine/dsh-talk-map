import fs from 'node:fs'
const file = 'test/probe.mjs'
let text = fs.readFileSync(file, 'utf8')
const before = `  check('只剩「摘要注入 / 完整对话」两种模式（不继承已删除）',
    spawnModes.length === 2 && spawnModes.includes('完整对话'), JSON.stringify(spawnModes))`
const after = `  check('分叉面板共三种模式：摘要注入 / 当前上下文 / 完整对话（不继承已删除）',
    spawnModes.length === 3
      && spawnModes.includes('摘要注入')
      && spawnModes.includes('当前上下文')
      && spawnModes.includes('完整对话')
      && !spawnModes.includes('不继承'), JSON.stringify(spawnModes))`
if (!text.includes(before)) throw new Error('probe anchor missing')
fs.writeFileSync(file, text.replace(before, after), 'utf8')
console.log('probe updated for three modes')
