import fs from 'node:fs'
const s = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
const anchor = [
  '      items.push({',
  "        key: 'rename',",
  "        icon: 'rename',",
  "        label: t('menu.rename'),",
].join('\n')
console.log('anchor found:', s.includes(anchor))
const index = s.indexOf("key: 'rename'")
console.log('context:', JSON.stringify(s.slice(index - 60, index + 80)))
