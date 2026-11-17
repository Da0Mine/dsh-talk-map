/** Revert 0.1.81: the crosshair belongs in the sidebar footer, not in the map header. */
import fs from 'node:fs'

// ── MapOverlay: remove the header crosshair + its icon + the import we added ──
{
  const file = 'src/client/MapOverlay.tsx'
  let text = fs.readFileSync(file, 'utf8')

  // the button block
  const start = text.indexOf('        <button\n          type="button"\n          className={styles[\'backToCurrent\']}')
  if (start >= 0) {
    const end = text.indexOf('        </button>\n', start)
    if (end < 0) throw new Error('header crosshair end not found')
    text = text.slice(0, start) + text.slice(end + '        </button>\n'.length)
    console.log('MapOverlay: header crosshair removed')
  }

  // the icon component
  const iconAt = text.indexOf('/** Crosshair: "come back to the conversation this map was opened from". */')
  if (iconAt >= 0) {
    const iconEnd = text.indexOf('\n}\n', iconAt)
    text = text.slice(0, iconAt) + text.slice(iconEnd + 3)
    console.log('MapOverlay: icon removed')
  }

  text = text.replace(
    "import { closeMapPanel, currentSessionId, hideSidebarForMap, mapUi, openSessionInUi, restoreSidebarAfterMap } from './map-state.ts'",
    "import { closeMapPanel, hideSidebarForMap, mapUi, openSessionInUi, restoreSidebarAfterMap } from './map-state.ts'",
  )
  fs.writeFileSync(file, text, 'utf8')
}

// ── MapToggleButton: put the crosshair back beside the map toggle ──────────
{
  const file = 'src/client/MapToggleButton.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    "import { mapUi, reportSidebarWide } from './map-state.ts'",
    "import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'",
  )

  const icon = [
    '',
    '/** Crosshair: "come back to the conversation this map was opened from". */',
    'function BackIcon(): React.JSX.Element {',
    '  return (',
    '    <svg className={styles[\'backToCurrentIcon\']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">',
    '      <circle cx="12" cy="12" r="6.5" />',
    '      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />',
    '      <path d="M12 1.8v4.2M12 18v4.2M1.8 12h4.2M18 12h4.2" />',
    '    </svg>',
    '  )',
    '}',
  ].join('\n')

  if (!text.includes('function BackIcon(')) {
    text = text.replace('\nexport function MapToggleButton(', icon + '\nexport function MapToggleButton(')
  }

  if (!text.includes("const backTitle = t('map.backToCurrent')")) {
    text = text.replace(
      "  const classNames = [wide ? styles['toggleRow'] : styles['toggleButton']]",
      "  const backTitle = t('map.backToCurrent')\n  const classNames = [wide ? styles['toggleRow'] : styles['toggleButton']]",
    )
  }

  const button = [
    '      <button',
    '        type="button"',
    "        className={styles['backToCurrent']}",
    '        lang={locale}',
    '        title={backTitle}',
    '        aria-label={backTitle}',
    '        data-talkmap-back="1"',
    '        onClick={() => {',
    '          const sessionId = currentSessionId()',
    '          if (sessionId === undefined) return',
    '          // Leaving the map (if it is what you are looking at) and revealing the',
    '          // conversation is one gesture: the shell then shows that session again.',
    '          closeMapPanel()',
    '          openSessionInUi(sessionId)',
    '        }}',
    '      >',
    '        <BackIcon />',
    '      </button>',
  ].join('\n')

  if (!text.includes('data-talkmap-back')) {
    // after the map toggle button, still inside .toggleControls
    const anchor = text.indexOf("        {wide ? <span className={styles['toggleLabel']}>{t('map.toggle')}</span> : null}\n      </button>\n")
    if (anchor < 0) throw new Error('map toggle end not found')
    const insertAt = anchor + "        {wide ? <span className={styles['toggleLabel']}>{t('map.toggle')}</span> : null}\n      </button>\n".length
    text = text.slice(0, insertAt) + button + '\n' + text.slice(insertAt)
  }
  fs.writeFileSync(file, text, 'utf8')
  console.log('MapToggleButton: crosshair restored')
}
