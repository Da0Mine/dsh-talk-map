/**
 * Round two of the liquid glass:
 *   1. rail cards get their own (smaller) refraction;
 *   2. the HarmonyOS-style cursor glow from echo-liquid-glass (radial fill + masked 2px
 *      border light that follows the pointer);
 *   3. the map's top header becomes glass too.
 */
import fs from 'node:fs'

const edits = []

// ── 1. glow installer in liquid-glass.ts ──────────────────────────────────
{
  const file = 'src/client/liquid-glass.ts'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('installGlow')) {
    text += `
export interface GlowOptions {
  /** Colour of the glow; defaults to white. */
  color?: string
  /** Radius of the soft radial fill. */
  radius?: number
  /** Radius of the border-light mask (HarmonyOS style). */
  borderRadius?: number
}

/**
 * HarmonyOS-style cursor glow, ported from echo-liquid-glass: a radial fill plus a masked
 * 2px inner border, both following the pointer through \`--glow-x\` / \`--glow-y\`.
 */
export function installGlow(element: HTMLElement, options: GlowOptions = {}): () => void {
  element.setAttribute('data-liquid-glow', '1')
  element.style.setProperty('--glow-color', options.color ?? 'rgba(255, 255, 255, 0.95)')
  element.style.setProperty('--glow-radius', \`\${options.radius ?? 170}px\`)
  element.style.setProperty('--border-glow-radius', \`\${options.borderRadius ?? 120}px\`)

  let frame = 0
  const onMove = (event: PointerEvent): void => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const rect = element.getBoundingClientRect()
      element.style.setProperty('--glow-x', \`\${event.clientX - rect.left}px\`)
      element.style.setProperty('--glow-y', \`\${event.clientY - rect.top}px\`)
    })
  }
  element.addEventListener('pointermove', onMove, { passive: true })

  return () => {
    element.removeEventListener('pointermove', onMove)
    if (frame !== 0) cancelAnimationFrame(frame)
    element.removeAttribute('data-liquid-glow')
    for (const name of ['--glow-color', '--glow-radius', '--border-glow-radius', '--glow-x', '--glow-y']) {
      element.style.removeProperty(name)
    }
  }
}
`
    fs.writeFileSync(file, text, 'utf8')
    edits.push('installGlow')
  }
}

// ── 2. StatusRail: card glass + glow on panel/cards ───────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')

  if (!text.includes('installGlow')) {
    text = text.replace(
      "import { installLiquidGlass } from './liquid-glass.ts'",
      "import { installGlow, installLiquidGlass } from './liquid-glass.ts'",
    )
  }

  // panel: also glow
  text = text.replace(
    '    return installLiquidGlass(element, { radius: 22, bezel: 26, thickness: 90, ior: 2.4, scale: 58, specular: 0.42 })',
    `    const disposeGlass = installLiquidGlass(element, { radius: 22, bezel: 26, thickness: 90, ior: 2.4, scale: 58, specular: 0.42 })
    const disposeGlow = installGlow(element, { radius: 240, borderRadius: 170 })
    return () => {
      disposeGlass()
      disposeGlow()
    }`,
  )

  // cards: decorate whatever carries data-glass-card
  if (!text.includes('data-glass-card')) {
    text = text.replace(
      '  const renderCard = (entry: StatusRailEntry, floating: boolean): React.JSX.Element => (',
      `  // Cards are re-created on every reorder, so they are decorated by scanning the panel
  // instead of by a ref callback (a ref would re-install on every render).
  useEffect(() => {
    const root = panelRef.current
    if (root === null) return undefined
    const installed = new Map<HTMLElement, () => void>()
    const decorate = (): void => {
      for (const element of root.querySelectorAll<HTMLElement>('[data-glass-card]')) {
        if (installed.has(element)) continue
        const disposeGlass = installLiquidGlass(element, { radius: 16, bezel: 14, thickness: 46, ior: 2.2, scale: 22, specular: 0.3 })
        const disposeGlow = installGlow(element, { radius: 130, borderRadius: 90 })
        installed.set(element, () => {
          disposeGlass()
          disposeGlow()
        })
      }
      for (const [element, dispose] of installed) {
        if (element.isConnected) continue
        dispose()
        installed.delete(element)
      }
    }
    decorate()
    const observer = new MutationObserver(decorate)
    observer.observe(root, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      for (const dispose of installed.values()) dispose()
    }
  }, [])

  const renderCard = (entry: StatusRailEntry, floating: boolean): React.JSX.Element => (`,
    )

    // tag the card element
    text = text.replace(
      `      className={\`\${styles['card']} \${entry.lamp === undefined ? '' : styles[LAMP_CLASS[entry.lamp]] ?? ''} \${`,
      `      data-glass-card="1"
      className={\`\${styles['card']} \${entry.lamp === undefined ? '' : styles[LAMP_CLASS[entry.lamp]] ?? ''} \${`,
    )
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail cards')
}

// ── 3. MapOverlay: glass header ──────────────────────────────────────────
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('installLiquidGlass')) {
    const importAt = text.split('\n').find(line => line.startsWith('import '))
    text = text.replace(importAt, importAt + "\nimport { installGlow, installLiquidGlass } from './liquid-glass.ts'")
  }
  if (!text.includes('headerRef')) {
    // ref + effect, inserted right before the return that renders the panel
    const anchor = "      <div className={styles['header']}>"
    if (!text.includes(anchor)) throw new Error('header anchor missing')
    text = text.replace(anchor, "      <div className={styles['header']} ref={headerRef}>")
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapOverlay header ref')
}

console.log(edits.join(', '))
