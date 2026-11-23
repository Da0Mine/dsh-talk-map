/**
 * Glass cost control. Measured with the rail open: pan median 33 ms / p95 91 ms at 800 cards
 * (it was 17 / 19 with the rail closed), because a 22px backdrop-filter plus a per-card
 * backdrop-filter re-sample the canvas every frame.
 *
 *   - cards lose their own backdrop-filter (they sit on an already-blurred panel);
 *   - the panel blurs at rest only: React Flow's move events set `frozen`, which swaps the
 *     blur for a static translucent fill while the canvas is moving.
 */
import fs from 'node:fs'

const edits = []

// ── CSS ───────────────────────────────────────────────────────────────────
{
  const file = 'src/client/talk-map.module.css'
  let text = fs.readFileSync(file, 'utf8')

  const cardBefore = `  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 42%),
    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 66%, transparent);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);`
  const cardAfter = `  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 44%),
    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 70%, transparent);`
  if (!text.includes(cardBefore)) throw new Error('card glass block not found')
  text = text.replace(cardBefore, cardAfter)

  text = text.replace('backdrop-filter: blur(22px) saturate(190%) brightness(1.08);', 'backdrop-filter: blur(16px) saturate(190%) brightness(1.08);')
  text = text.replace('-webkit-backdrop-filter: blur(22px) saturate(190%) brightness(1.08);', '-webkit-backdrop-filter: blur(16px) saturate(190%) brightness(1.08);')

  // frozen = 画布在动：不采样背景，用不透一点的渐变顶上（视觉上仍是玻璃，只是不做实时模糊）
  if (!text.includes('data-frozen="1"')) {
    text += `
/* While the canvas moves, the blur is swapped for a static fill: same glass look, no
   per-frame backdrop sampling. */
.statusRail[data-frozen="1"] .statusRailPanel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background:
    linear-gradient(158deg,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 74%, transparent) 0%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 58%, transparent) 44%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 70%, transparent) 100%);
}
`
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('css')
}

// ── StatusRail: frozen prop → data attribute ──────────────────────────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')

  if (!text.includes('frozen?: boolean')) {
    const ifaceAt = text.indexOf('export interface StatusRailProps {')
    if (ifaceAt < 0) throw new Error('props interface missing')
    const closeAt = text.indexOf('\n}', ifaceAt)
    text = text.slice(0, closeAt) + '\n  /** The canvas is moving: drop the live blur for a static fill. */\n  frozen?: boolean' + text.slice(closeAt)
  }
  text = text.replace(
    "      data-open={open ? '1' : '0'}",
    "      data-open={open ? '1' : '0'}\n      data-frozen={props.frozen === true ? '1' : '0'}",
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail')
}

// ── MapCanvas: track panning and pass it down ────────────────────────────
{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')

  if (!text.includes('railFrozen')) {
    const anchor = "  const [previews, setPreviews] = useState<Record<string, string>>(readPreviewTexts)"
    if (!text.includes(anchor)) throw new Error('previews state anchor missing')
    text = text.replace(
      anchor,
      anchor + `
  /** True while the canvas is panning/zooming: the rail's glass degrades for the duration. */
  const [railFrozen, setRailFrozen] = useState(false)`,
    )
  }

  const moveEnd = '        onMoveEnd={(_event, viewport: Viewport) => {'
  if (!text.includes(moveEnd)) throw new Error('onMoveEnd anchor missing')
  text = text.replace(moveEnd, '        onMoveStart={() => { setRailFrozen(true) }}\n        onMoveEnd={(_event, viewport: Viewport) => {\n          setRailFrozen(false)')

  const railCall = '          onOpen={openRailCard}\n        />'
  if (!text.includes(railCall)) throw new Error('rail render anchor missing')
  text = text.replace(railCall, '          onOpen={openRailCard}\n          frozen={railFrozen}\n        />')

  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapCanvas')
}

console.log(edits.join(', '))
