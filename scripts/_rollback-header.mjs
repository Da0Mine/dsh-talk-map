/**
 * Roll back two things the user asked for:
 *   1. the top bar goes back to its original look (no glass, no floating): the header effect,
 *      the measured offset, the transparent panel and the absolute positioning all go away;
 *   2. the rail's refraction band returns to 26px (it was widened to 40px). The 14px
 *      displacement stays — that is what fixed the ghosting.
 */
import fs from 'node:fs'
const edits = []

// ── MapOverlay: drop the header effect entirely ──────────────────────────
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace("import { installLiquidGlass } from './liquid-glass.ts'\n", '')
  text = text.replace("      <div className={styles['header']} ref={headerRef}>", "      <div className={styles['header']}>")
  // 整个 header 玻璃 effect（含 --tm-header-h 与 ResizeObserver）
  const start = text.indexOf('  // Top bar of the map: same liquid glass as the rail')
  const end = text.indexOf('  }, [])', text.indexOf("  useEffect(() => {", start)) + '  }, [])'.length
  if (start >= 0 && end > start) text = text.slice(0, start) + text.slice(end + 1)
  text = text.replace('  const headerRef = useRef<HTMLDivElement | null>(null)\n', '')
  text = text.replace("import { useEffect, useRef, useSyncExternalStore } from 'react'", "import { useEffect, useSyncExternalStore } from 'react'")
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapOverlay')
}

// ── CSS: keep only the rail refraction, drop the header fixes ────────────
{
  const file = 'src/client/talk-map.module.css'
  let text = fs.readFileSync(file, 'utf8')
  const fixesAt = text.indexOf('/* ==== glass fixes ==== */')
  if (fixesAt < 0) throw new Error('glass fixes block missing')
  text = text.slice(0, fixesAt)
  // 折射带宽 40 -> 26（保留 14 的位移）
  text = text.replace('bezel: 40', 'bezel: 26')
  fs.writeFileSync(file, text, 'utf8')
  edits.push('CSS')
}

// ── StatusRail: bezel back to 26 ─────────────────────────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace('{ radius: 22, bezel: 40, thickness: 90, ior: 2.2, scale: 14, specular: 0.3 }',
    '{ radius: 22, bezel: 26, thickness: 90, ior: 2.2, scale: 14, specular: 0.3 }')
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail')
}

console.log(edits.join(', '))
