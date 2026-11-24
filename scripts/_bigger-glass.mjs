import fs from 'node:fs'

// 1) 面板折射参数调大
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const before = `    // Plugin defaults only: thickness 100, bezel 40, ior 2.5, specular 0.5, bgOpacity 50, blur 2.
    return installLiquidGlass(element)`
  const after = `    // Plugin defaults are thickness 100 / bezel 40 / ior 2.5 / specular 0.5. Widened here:
    // a thicker slab and a 60px bezel push the bent band further into the surface.
    return installLiquidGlass(element, { thickness: 160, bezelWidth: 60, ior: 2.6, specularOpacity: 0.6, scale: 96 })`
  if (!t.includes(before)) throw new Error('panel glass anchor missing')
  t = t.replace(before, after)
  fs.writeFileSync(f, t, 'utf8')
  console.log('面板折射：thickness 160 / bezel 60 / ior 2.6 / specular 0.6 / scale 96')
}

// 2) 面板可见边光 + 卡片玻璃与模糊
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('/* Bigger bezel: beyond the radius the filter cannot reach')) {
    t += `
/* Bigger bezel: beyond the radius the filter cannot reach, so the bent band is echoed with a
   visible rim + inner glow sized to match the 60px bezel request. */
.statusRailPanel {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 0 26px rgba(255, 255, 255, 0.05),
    inset 0 0 64px rgba(255, 255, 255, 0.02);
}

/* Rail cards: the same glass, with a blur so the canvas behind them melts. No box-shadow here —
   it would beat .cardLamp* and swallow the lamp glow. */
.statusRailPanel .card {
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 58%, transparent);
  border-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px) saturate(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(1.15);
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 面板边光 + 卡片玻璃模糊')
  }
}
