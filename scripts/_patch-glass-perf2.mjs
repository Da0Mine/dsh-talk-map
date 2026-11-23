import fs from 'node:fs'
const edits = []
// 1) frozen 规则
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('data-frozen="1"')) {
    t += `
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
    fs.writeFileSync(f, t, 'utf8')
    edits.push('css frozen')
  }
}
// 2) StatusRail
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('frozen?: boolean')) {
    const ifaceAt = t.indexOf('export interface StatusRailProps {')
    const closeAt = t.indexOf('\n}', ifaceAt)
    t = t.slice(0, closeAt) + '\n  /** Canvas is moving: drop the live blur for a static fill. */\n  frozen?: boolean' + t.slice(closeAt)
  }
  if (!t.includes('data-frozen')) {
    t = t.replace("      data-open={open ? '1' : '0'}", "      data-open={open ? '1' : '0'}\n      data-frozen={props.frozen === true ? '1' : '0'}")
  }
  fs.writeFileSync(f, t, 'utf8')
  edits.push('StatusRail')
}
// 3) MapCanvas
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('railFrozen')) {
    const anchor = "  const [previews, setPreviews] = useState<Record<string, string>>(readPreviewTexts)"
    t = t.replace(anchor, anchor + "\n  /** Canvas panning: the rail's glass degrades for the duration. */\n  const [railFrozen, setRailFrozen] = useState(false)")
  }
  if (!t.includes('onMoveStart')) {
    t = t.replace('        onMoveEnd={(_event, viewport: Viewport) => {', '        onMoveStart={() => { setRailFrozen(true) }}\n        onMoveEnd={(_event, viewport: Viewport) => {\n          setRailFrozen(false)')
  }
  if (!t.includes('frozen={railFrozen}')) {
    t = t.replace('          onOpen={openRailCard}\n        />', '          onOpen={openRailCard}\n          frozen={railFrozen}\n        />')
  }
  fs.writeFileSync(f, t, 'utf8')
  edits.push('MapCanvas')
}
console.log(edits.join(', '))
