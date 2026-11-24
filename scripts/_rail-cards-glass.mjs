import fs from 'node:fs'

// ---------- TSX：去掉折射滤镜 + 卡片尺寸不再跟随宽度 ----------
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')

  // 1) 移除面板与把手的 SVG 折射（该滤镜在本宿主不产生位移，却会在拖动改宽时留下旧快照拖影）
  const panelFx = `  // Real refraction on the panel: the backdrop is bent along the bezel by an SVG
  // displacement filter (ported from EchoMusic's echo-liquid-glass).
  useEffect(() => {
    const element = panelRef.current
    if (element === null) return undefined
    // Plugin defaults only: thickness 100, bezel 40, ior 2.5, specular 0.5, bgOpacity 50, blur 2.
    return installLiquidGlass(element)
  }, [])

  // The handle runs the plugin's own recipe with the panel's values — no blur, no fill.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element)
  }, [])`
  if (!t.includes(panelFx)) throw new Error('glass effects anchor missing')
  t = t.replace(panelFx, `  // No SVG backdrop filter here: measured zero pixel difference in this host, and resizing the
  // panel while it is applied leaves a stale-snapshot smear trailing the pointer. The visual
  // material is pure CSS (translucent fill + hairline rim).`)
  t = t.replace(`import { installLiquidGlass } from './liquid-glass.ts'\n`, '')

  // 2) 拖宽只改 --rail-w，卡片宽度保持固定 → 由 CSS 换行成多列
  t = t.replace(
    `      style={railWidth === null
        ? { ['--rail-card-w' as string]: \`\${props.cardWidth}px\` }
        : {
            ['--rail-card-w' as string]: \`\${Math.max(160, railWidth - 84)}px\`,
            ['--rail-w' as string]: \`\${railWidth}px\`,
          }}`,
    `      style={railWidth === null
        ? { ['--rail-card-w' as string]: \`\${props.cardWidth}px\` }
        : {
            ['--rail-card-w' as string]: \`\${props.cardWidth}px\`,
            ['--rail-w' as string]: \`\${railWidth}px\`,
          }}`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('TSX: 移除滤镜；卡片宽度固定')
}

// ---------- CSS：换行多列 + 卡片玻璃 ----------
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')

  // 列表改成可换行的横向流：卡片尺寸不变，宽度够了就并排
  t = t.replace(
    `  overflow-y: auto;
  display: flex;
  flex-direction: column;`,
    `  overflow-y: auto;
  /* Cards keep their size; a wider rail simply fits more columns. */
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;`,
  )

  if (!t.includes('/* Rail cards: same translucent material as the panel')) {
    t += `
/* Rail cards: the panel's material, one step lighter — translucent fill plus a hairline rim.
   No box-shadow here: it would beat the .cardLamp* rules and swallow the glow. */
.statusRailPanel .card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02) 38%, rgba(255, 255, 255, 0) 72%),
    color-mix(in srgb, var(--dsw-alias-bg-layer-1, #232529) 62%, transparent);
  border-color: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(6px) saturate(1.15);
  -webkit-backdrop-filter: blur(6px) saturate(1.15);
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 列表换行 + 卡片玻璃')
  }
}
