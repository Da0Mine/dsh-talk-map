import fs from 'node:fs'
const prof = process.env.USERPROFILE + '\\.dsh\\profiles\\desktop\\package.json'
const json = JSON.parse(fs.readFileSync(prof, 'utf8'))
const hits = []
function walk(node, pathStr) {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i -= 1) {
      if (node[i] === 'dsh-talk-map') { node.splice(i, 1); hits.push(pathStr) }
    }
    return
  }
  if (node !== null && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, pathStr === '' ? k : `${pathStr}.${k}`)
  }
}
walk(json, '')
fs.writeFileSync(prof, JSON.stringify(json, null, 2) + '\n', { encoding: 'utf8' })
console.log('移除的数组路径:', hits.join(', ') || '（无）')
console.log('残留:', fs.readFileSync(prof, 'utf8').includes('dsh-talk-map') ? '仍有' : '无')
