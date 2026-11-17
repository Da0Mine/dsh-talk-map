/**
 * Move the "back to current conversation" crosshair out of the sidebar footer.
 * It lives in the map panel's header from now on; the footer keeps a single map button.
 */
import fs from 'node:fs'

// ── 1. MapToggleButton: drop the button + its icon + now-unused imports ────
{
  const file = 'src/client/MapToggleButton.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')

  // the second <button ...> inside .toggleControls (data-talkmap-back)
  const flag = lines.findIndex(l => l.includes('data-talkmap-back'))
  if (flag < 0) throw new Error('footer crosshair not found')
  let start = flag
  while (start > 0 && !(lines[start - 1].trim() === '<button' || lines[start - 1].trim().startsWith('<button'))) start -= 1
  // start currently points at the line after '<button'; walk to the true '<button' line
  start = lines.findIndex((l, i) => i < flag && i > flag - 8 && l.trim() === '<button')
  if (start < 0) throw new Error('button open tag not found')
  let end = flag
  while (end < lines.length && lines[end].trim() !== '</button>') end += 1
  if (end >= lines.length) throw new Error('button close tag not found')
  lines.splice(start, end - start + 1)
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  console.log('removed footer crosshair button (lines', start + 1, '..', end + 1, ')')
}

{
  const file = 'src/client/MapToggleButton.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  // BackIcon definition (comment line + function ... })
  const at = lines.findIndex(l => l.startsWith('function BackIcon('))
  if (at >= 0) {
    let from = at
    if (lines[from - 1] !== undefined && lines[from - 1].trim().startsWith('/**')) from -= 1
    let to = at
    while (to < lines.length && lines[to] !== '}') to += 1
    lines.splice(from, to - from + 1)
    fs.writeFileSync(file, lines.join('\n'), 'utf8')
    console.log('removed BackIcon definition')
  }
}

{
  const file = 'src/client/MapToggleButton.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'",
    "import { mapUi, reportSidebarWide } from './map-state.ts'",
  )
  text = text.replace("  const backTitle = t('map.backToCurrent')\n", '')
  text = text.replace(
    ` * Sidebar footer action row: the map toggle plus a small "back to this conversation"
 * button on its right. The second button exists because leaving the map for another panel
 * (plugins, settings, …) otherwise means walking back through the map to find the session
 * you came from — this jumps straight back to it.`,
    ` * Sidebar footer action row: the map's queue (wide sidebar) and, under it, the map toggle.
 * The "back to this conversation" crosshair that used to sit beside the toggle now lives in
 * the map panel's header, where it belongs to the panel rather than to the sidebar chrome.`,
  )
  fs.writeFileSync(file, text, 'utf8')
  console.log('imports/comment cleaned')
}

// ── 2. MapOverlay: crosshair in the header ─────────────────────────────────
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    "import { closeMapPanel, hideSidebarForMap, mapUi, openSessionInUi, restoreSidebarAfterMap } from './map-state.ts'",
    "import { closeMapPanel, currentSessionId, hideSidebarForMap, mapUi, openSessionInUi, restoreSidebarAfterMap } from './map-state.ts'",
  )

  const icon = [
    '/** Crosshair: "come back to the conversation this map was opened from". */',
    'function BackToCurrentIcon(): React.JSX.Element {',
    '  return (',
    "    <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"1.7\" strokeLinecap=\"round\">",
    '      <circle cx="12" cy="12" r="6.5" />',
    '      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />',
    '      <path d="M12 1.8v4.2M12 18v4.2M1.8 12h4.2M18 12h4.2" />',
    '    </svg>',
    '  )',
    '}',
    '',
  ].join('\n')

  if (!text.includes('function BackToCurrentIcon(')) {
    text = text.replace('export function MapOverlay(', icon + 'export function MapOverlay(')
  }

  const button = [
    '        <button',
    '          type="button"',
    "          className={styles['backToCurrent']}",
    "          lang={activeLocale()}",
    "          title={t('map.backToCurrent')}",
    "          aria-label={t('map.backToCurrent')}",
    '          data-talkmap-back="1"',
    '          onClick={() => {',
    '            const sessionId = currentSessionId()',
    '            if (sessionId === undefined) return',
    '            // Leaving the map and revealing that conversation is one gesture.',
    '            closeMapPanel()',
    '            openSessionInUi(sessionId)',
    '          }}',
    '        >',
    '          <BackToCurrentIcon />',
    '        </button>',
  ].join('\n')

  const anchor = "        <span className={styles['headerSpace']} />"
  if (!text.includes(anchor)) throw new Error('header anchor missing')
  if (!text.includes('data-talkmap-back')) text = text.replace(anchor, button + '\n' + anchor)
  fs.writeFileSync(file, text, 'utf8')
  console.log('header crosshair added')
}

// ── 3. CSS: header variant of the crosshair ───────────────────────────────
{
  const file = 'src/client/talk-map.module.css'
  let sheet = fs.readFileSync(file, 'utf8')
  if (!sheet.includes('.header .backToCurrent')) {
    sheet += String.raw`

/* The crosshair as a panel-header button (it used to be a footer icon). */
.header .backToCurrent {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--dsw-alias-label-secondary);
}
`
  }
  fs.writeFileSync(file, sheet, 'utf8')
  console.log('css header crosshair')
}
