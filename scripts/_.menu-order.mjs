/**
 * Card menu order: 置顶 → 标为未读 → 重命名 → 查看摘要 → 归档 → 删除 → 批量.
 * (The user reads the menu top-down; pin/unread are the two quick state flips.)
 */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let lines = fs.readFileSync(file, 'utf8').split('\n')
const EOL = lines[0].includes('\r') ? '\r\n' : '\n'
let source = lines.join('\n')

// locate the blocks by their unique markers
const digestStart = source.indexOf('      // Read-only: exactly the text this card would push to another session.')
const renameStart = source.indexOf("      items.push({\n        key: 'rename',") >= 0
  ? source.indexOf("      items.push({\n        key: 'rename',")
  : source.indexOf("      items.push({\r\n        key: 'rename',")
const unreadStart = source.indexOf('      // Mark it unread by hand:')
const archiveStart = source.indexOf("      items.push({\n        key: 'archive',") >= 0
  ? source.indexOf("      items.push({\n        key: 'archive',")
  : source.indexOf("      items.push({\r\n        key: 'archive',")

if ([digestStart, renameStart, unreadStart, archiveStart].some(index => index < 0)) {
  console.error('anchors missing', { digestStart, renameStart, unreadStart, archiveStart })
  process.exit(1)
}

const digestBlock = source.slice(digestStart, renameStart)
const renameBlock = source.slice(renameStart, unreadStart)
const unreadBlock = source.slice(unreadStart, archiveStart)

const reordered = unreadBlock + renameBlock + digestBlock
const next = source.slice(0, digestStart) + reordered + source.slice(archiveStart)
fs.writeFileSync(file, next, 'utf8')
console.log('card menu reordered')
