import fs from 'node:fs'
const prof = process.env.USERPROFILE + '\\.dsh\\profiles\\desktop\\package.json'
const raw = fs.readFileSync(prof, 'utf8')
const json = JSON.parse(raw)
const removed = []
if (json.dependencies && json.dependencies['dsh-talk-map'] !== undefined) {
  delete json.dependencies['dsh-talk-map']
  removed.push('dependencies')
}
// 任何包含它的数组（bundle/plugins 列表）
for (const [key, value] of Object.entries(json)) {
  if (Array.isArray(value)) {
    const index = value.indexOf('dsh-talk-map')
    if (index >= 0) { value.splice(index, 1); removed.push(key) }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [innerKey, innerValue] of Object.entries(value)) {
      if (Array.isArray(innerValue)) {
        const index = innerValue.indexOf('dsh-talk-map')
        if (index >= 0) { innerValue.splice(index, 1); removed.push(`${key}.${innerKey}`) }
      }
    }
  }
}
fs.writeFileSync(prof, JSON.stringify(json, null, 2) + '\n', { encoding: 'utf8' })
console.log('摘除位置:', removed.join(', ') || '（没找到）')
console.log('残留引用:', fs.readFileSync(prof, 'utf8').includes('dsh-talk-map') ? '仍有' : '无')
