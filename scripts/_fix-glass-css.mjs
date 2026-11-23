import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.includes("dsw-alias-bg-layer-1, #1b1e26) 66%"))
if (at < 0) throw new Error('card block not found')
// 丢掉卡片自己的 backdrop-filter（它已在模糊过的面板里，嵌套模糊最贵），并提高一点不透明度
lines[at] = "    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 70%, transparent);"
for (let i = at + 1; i <= at + 3; i += 1) {
  if (lines[i].includes('backdrop-filter')) lines[i] = null
}
const kept = lines.filter(l => l !== null)
let text = kept.join('\n')
text = text.replace('backdrop-filter: blur(22px) saturate(190%) brightness(1.08);', 'backdrop-filter: blur(16px) saturate(190%) brightness(1.08);')
text = text.replace('-webkit-backdrop-filter: blur(22px) saturate(190%) brightness(1.08);', '-webkit-backdrop-filter: blur(16px) saturate(190%) brightness(1.08);')
fs.writeFileSync(f, text, 'utf8')
console.log('CSS：卡片去嵌套模糊，面板 16px')
