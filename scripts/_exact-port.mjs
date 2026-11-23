import fs from 'node:fs'
// 1) liquid-glass.ts：半径取四角最大值（我们的面板是 0/20/20/0）
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    const cssRadius = Number.parseFloat(style.borderRadius) || 9999
    const radius = Math.min(cssRadius, width / 2, height / 2)`,
    `    // The plugin reads parseFloat(borderRadius); our panel is "0 20px 20px 0", so take the
    // largest corner instead of the first token.
    const corners = style.borderRadius.split(/\\s+/).map(value => Number.parseFloat(value) || 0)
    const cssRadius = Math.max(...corners) || 0
    const radius = Math.min(cssRadius, width / 2, height / 2)`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('liquid-glass: 半径取四角最大值')
}
// 2) StatusRail：面板用默认参数；把手不再单独挂玻璃
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    return installLiquidGlass(element, { radius: 22, bezel: 36, thickness: 110, ior: 2.45, scale: 22, specular: 0.34 })`,
    `    // Plugin defaults only: thickness 100, bezel 40, ior 2.5, specular 0.5, bgOpacity 50, blur 2.
    return installLiquidGlass(element)`,
  )
  // 删除把手玻璃 effect 与 ref
  const tabStart = t.indexOf('  // The handle that opens the rail is glass too.')
  if (tabStart >= 0) {
    const tabEnd = t.indexOf('  }, [])', t.indexOf('installLiquidGlass', tabStart)) + '  }, [])'.length
    t = t.slice(0, tabStart) + t.slice(tabEnd + 1)
  }
  t = t.replace("      ref={tabRef}\n", '')
  t = t.replace('  const tabRef = useRef<HTMLButtonElement | null>(null)\n', '')
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 默认参数；把手不挂玻璃')
}
// 3) CSS：只留必要的圆角（折射需要非零半径），其余全部删除
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  const at = t.indexOf('/* ==== liquid glass paint ==== */')
  if (at >= 0) t = t.slice(0, at)
  t += `/* ==== liquid glass ==== */
/* Only what the refraction needs: a non-zero corner radius. No fill, no border, no shadow,
   no extra layers — the plugin's own filter supplies the material. */
.statusRailPanel {
  border-radius: 0 20px 20px 0;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 只保留圆角')
}
