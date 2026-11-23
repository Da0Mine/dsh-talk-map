/**
 * Fix round:
 *   - glow removed (user asked);
 *   - displacement was far too strong (58 px) — on a 262 px wide panel that pulls content
 *     from outside the panel and reads as a misaligned duplicate. Scale drops to ~14 px and
 *     the refracting band widens (bezel 40) so the bend is broad and gentle instead of a hard
 *     smear at the edge;
 *   - the map header could never show the canvas because `.panel` painted an opaque base
 *     behind it. The panel becomes transparent and the header floats over the canvas.
 */
import fs from 'node:fs'

const edits = []

// ── StatusRail: no glow, softer/wider refraction ──────────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "import { installGlow, installLiquidGlass } from './liquid-glass.ts'",
    "import { installLiquidGlass } from './liquid-glass.ts'",
  )
  text = text.replace(
    `    const disposeGlass = installLiquidGlass(element, { radius: 22, bezel: 26, thickness: 90, ior: 2.4, scale: 58, specular: 0.42 })
    const disposeGlow = installGlow(element, { radius: 240, borderRadius: 170 })
    return () => {
      disposeGlass()
      disposeGlow()
    }`,
    `    return installLiquidGlass(element, { radius: 22, bezel: 40, thickness: 90, ior: 2.2, scale: 14, specular: 0.3 })`,
  )
  // 卡片：光效删除，装饰逻辑整体移除
  const blockStart = text.indexOf('  // Cards are re-created on every reorder')
  const blockEnd = text.indexOf('  const renderCard = (entry: StatusRailEntry')
  if (blockStart >= 0 && blockEnd > blockStart) {
    text = text.slice(0, blockStart) + text.slice(blockEnd)
  }
  text = text.replace('      data-glass-card="1"\n', '')
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail')
}

// ── MapOverlay: no glow, gentler refraction ───────────────────────────────
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "import { installGlow, installLiquidGlass } from './liquid-glass.ts'",
    "import { installLiquidGlass } from './liquid-glass.ts'",
  )
  text = text.replace(
    `    const disposeGlass = installLiquidGlass(element, { radius: 16, bezel: 18, thickness: 60, ior: 2.3, scale: 34, specular: 0.34 })
    const disposeGlow = installGlow(element, { radius: 220, borderRadius: 150 })
    return () => {
      disposeGlass()
      disposeGlow()
    }`,
    `    return installLiquidGlass(element, { radius: 16, bezel: 28, thickness: 60, ior: 2.2, scale: 10, specular: 0.3 })`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapOverlay')
}

// ── CSS: drop glow rules, float the header over a transparent panel ───────
{
  const file = 'src/client/talk-map.module.css'
  let text = fs.readFileSync(file, 'utf8')
  const glowAt = text.indexOf('/* ==== harmony glow (ported from echo-liquid-glass) ==== */')
  if (glowAt >= 0) text = text.slice(0, glowAt).trimEnd() + '\n'
  text += `
/* ==== glass fixes ==== */
/* The panel is the map itself; it must not paint over the canvas, or nothing behind the
   header can ever be sampled. */
.panel {
  background: transparent;
}

/* Header floats above the canvas so its glass has the map behind it. */
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 30%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0 0 16px 16px;
}

/* Rail cards: no per-card filter (it cost 33 ms/frame), just a clear tile. */
.statusRailPanel .card {
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 56%, transparent);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), 0 2px 10px rgba(0, 0, 0, 0.2);
}
`
  fs.writeFileSync(file, text, 'utf8')
  edits.push('CSS')
}

console.log(edits.join(', '))
