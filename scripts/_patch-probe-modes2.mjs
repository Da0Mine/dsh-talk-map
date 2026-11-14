import fs from 'node:fs'
const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes("spawnModes.length === 2"))
if (at < 0) { console.log('anchor not found'); process.exit(1) }
lines[at - 1] = "    check('分叉面板共三种模式：摘要注入 / 当前上下文 / 完整对话（不继承已删除）',"
lines[at] = "      spawnModes.length === 3 && spawnModes.includes('摘要注入') && spawnModes.includes('当前上下文') && spawnModes.includes('完整对话') && !spawnModes.includes('不继承'), JSON.stringify(spawnModes))"
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('probe assertion updated (line-index)')
