import fs from 'node:fs'
const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(line => line.includes("check('卡片菜单里有「查看摘要」'"))
if (at < 0) {
  console.error('anchor missing')
  process.exit(1)
}
const block = [
  '  // Reading order: 置顶 → 标为未读 → 重命名 → 查看摘要.',
  '  const order = (label) => cardMenu.findIndex(text => text.includes(label))',
  "  check('菜单顺序是 置顶 → 标为未读 → 重命名 → 查看摘要',",
  "    order('置顶') >= 0 && order('置顶') < order('标为未读')",
  "      && order('标为未读') < order('重命名') && order('重命名') < order('查看摘要'),",
  '    JSON.stringify(cardMenu))',
]
const next = [...lines.slice(0, at), ...block, ...lines.slice(at)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log('order check inserted at', at + 1)
