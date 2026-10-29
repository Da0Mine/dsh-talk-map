/** Jump: only ever flash text in the transcript, never in our own panel. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

let file = fs.readFileSync('src/client/jump-highlight.ts', 'utf8')

// --- replace findInPage with a panel-aware loop -------------------------
const oldFind = J([
  '/** The engine\'s own find: scrolls to the match, works with lazy transcripts. */',
  'function findInPage(needle: string): HTMLElement | null {',
  '  const finder = (window as unknown as { find?: (...args: unknown[]) => boolean }).find',
  '  if (typeof finder !== \'function\') return null',
  '  // (text, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog)',
  '  const found = finder.call(window, needle, false, false, true, false, false, false)',
  '  if (found !== true) return null',
  '  return markSelection()',
  '}',
])
const newFind = J([
  '/** True while the selection still sits inside the map panel. */',
  'function insideOurPanel(): boolean {',
  '  const selection = window.getSelection()',
  '  const node = selection?.anchorNode ?? null',
  '  const element = node === null ? null : (node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement)',
  '  return element !== null && element.closest(\'[class*="tm_"]\') !== null',
  '}',
  '',
  '/**',
  ' * The engine\'s own find, but skipping matches inside the map panel: the panel',
  ' * still holds its own copies of the searched text while it closes, and flashing',
  ' * those looked like "nothing happened" once the panel went away.',
  ' */',
  'function findInTranscript(needle: string): HTMLElement | null {',
  '  const finder = (window as unknown as { find?: (...args: unknown[]) => boolean }).find',
  '  if (typeof finder !== \'function\') return null',
  '  for (let attempt = 0; attempt < 12; attempt += 1) {',
  '    // (text, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog)',
  '    const found = finder.call(window, needle, false, false, true, false, false, false)',
  '    if (found !== true) return null',
  '    if (insideOurPanel()) continue',
  '    return markSelection()',
  '  }',
  '  return null',
  '}',
])
if (!file.includes(oldFind)) {
  console.error('findInPage block not found')
  process.exit(1)
}
file = file.replace(oldFind, newFind)

// --- wait for the panel to unmount before flashing ----------------------
file = file.replace(
  '  // The transcript needs a moment to mount after the panel switches.\n  window.setTimeout(attempt, 160)',
  J([
    '  // The transcript needs a moment to mount, and the map panel has to be GONE:',
    '  // while it is still in the DOM its result list owns the searched text.',
    '  const waitPanel = (): void => {',
    '    if (document.querySelector(\'[class*="tm_panel"]\') !== null && waited < 2000) {',
    '      waited += 60',
    '      window.setTimeout(waitPanel, 60)',
    '      return',
    '    }',
    '    waited = 0',
    '    window.setTimeout(attempt, 120)',
    '  }',
    '  window.setTimeout(waitPanel, 60)',
  ]),
)
file = file.replace('    const viaFind = findInPage(needle)', '    const viaFind = findInTranscript(needle)')
fs.writeFileSync('src/client/jump-highlight.ts', file, 'utf8')

console.log('jump: panel-aware find')
