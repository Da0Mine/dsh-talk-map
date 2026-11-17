/**
 * 1) Move the "back to current conversation" crosshair out of the sidebar footer and into
 *    the map panel's header (the footer keeps only the map toggle).
 * 2) Give the sidebar queue a hover-visible drag handle on its top edge so its height can
 *    be set by hand (persisted per machine).
 */
import fs from 'node:fs'

const edits = []

// ── 1. the icon moves to MapOverlay ────────────────────────────────────────
{
  const file = 'src/client/MapToggleButton.tsx'
  let text = fs.readFileSync(file, 'utf8')

  // drop the button block (data-talkmap-back ... )
  const startAt = text.indexOf('      <button\n        type="button"\n        className={styles[\'backToCurrent\']}')
  if (startAt < 0) throw new Error('footer back button not found')
  const endMarker = '      </button>\n      </div>'
  const endAt = text.indexOf(endMarker, startAt)
  if (endAt < 0) throw new Error('footer back button end not found')
  text = text.slice(0, startAt) + text.slice(endAt + '      </button>\n'.length)

  // imports that only the removed button used
  text = text.replace(
    "import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'\nimport { SidebarQueue } from './SidebarQueue.tsx'",
    "import { mapUi, reportSidebarWide } from './map-state.ts'\nimport { SidebarQueue } from './SidebarQueue.tsx'",
  )
  text = text.replace('  const backTitle = t(\'map.backToCurrent\')\n\n', '')
  // BackIcon function is now unused — hand it to MapOverlay instead of leaving dead code.
  const iconAt = text.indexOf('function BackIcon(')
  let icon = ''
  if (iconAt >= 0) {
    let end = text.indexOf('\n}\n', iconAt)
    end = end < 0 ? text.length : end + 3
    icon = text.slice(iconAt, end)
    text = text.slice(0, iconAt) + text.slice(end)
  }
  fs.writeFileSync(file, text, 'utf8')
  fs.writeFileSync('scripts/_back-icon.txt', icon, 'utf8')
  edits.push('MapToggleButton: footer crosshair removed')
}

// ── 2. MapOverlay: header gets the crosshair, wide drawer gets a drag handle ──
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')
  const icon = fs.readFileSync('scripts/_back-icon.txt', 'utf8')

  // imports
  text = text.replace(
    "import { closeMapPanel",
    "import { closeMapPanel, currentSessionId, openSessionInUi } from './map-state.ts'\nimport { closeMapPanel_UNUSED",
  )
  text = text.replace("import { closeMapPanel_UNUSED", "import {")
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapOverlay: imports (verify below)')
  console.log('icon length', icon.length)
}
console.log(edits.join('\n'))
