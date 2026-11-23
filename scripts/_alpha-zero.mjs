import fs from 'node:fs'
// 1) 默认 bgOpacity 30 -> 0（完全透明，只剩折射）
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace('const bgOpacity = options.bgOpacity ?? 30', 'const bgOpacity = options.bgOpacity ?? 0')
  fs.writeFileSync(f, t, 'utf8')
  console.log('bgOpacity 30 → 0')
}
// 2) 把手自身 CSS 也去掉底色/描边，避免和面板出现两种观感
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('/* Handle: same material as the panel')) {
    t += `
/* Handle: no material of its own — the refraction is the only thing it paints, and while the
   rail is open it is just the icon on the panel's glass. */
.statusRailTab {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 把手去底色/描边')
  }
}
