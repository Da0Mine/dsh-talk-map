/**
 * Fix the map-covered case: a completion seen while the map is up must keep its
 * lamp even when the shell reports "not unread" (it never flagged it at all).
 * Only a real true→false transition — or returning to the map after leaving it —
 * counts as "you have read it".
 */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

const file = 'src/client/session-activity.ts'
let source = fs.readFileSync(file, 'utf8')

// ---- state ------------------------------------------------------------
source = source.replace(
  'let needsBaseline = true',
  J([
    'let needsBaseline = true',
    '/** Bumped every time the map panel mounts: marks carry the epoch they were made in. */',
    'let panelEpoch = 0',
    'const markedEpoch = new Map<string, number>()',
    '/** Last completionUnread we saw per session, to detect a real transition. */',
    'const lastUnread = new Map<string, boolean | undefined>()',
  ]),
)
source = source.replace(
  '  beginPanelSession(): void {\n    needsBaseline = true\n  },',
  '  beginPanelSession(): void {\n    needsBaseline = true\n    panelEpoch += 1\n  },',
)

// ---- the rule ---------------------------------------------------------
const oldRule = J([
  '      // The shell itself says this completion has been read — you opened it from',
  '      // a desktop notification, the sidebar, anywhere that is not this map. Our',
  '      // mark only covers the case where the shell stays quiet about a run it',
  '      // could not see finished, so once the shell says "read", drop it.',
  '      if (finished.has(sessionId) && fact?.completionUnread === false) {',
  '        finished.delete(sessionId)',
  '        changed = true',
  '      }',
])
const newRule = J([
  '      // Two ways a mark can be released, and only two:',
  '      //  1. the shell flips completionUnread from true to false — somebody read',
  '      //     it (notification, sidebar, anywhere not this map);',
  '      //  2. you left the map and came back, and the session is now the one on',
  '      //     screen (markedEpoch < panelEpoch) — you were looking at it. Main-view',
  '      //     retention alone is NOT enough: while the map is open the session you',
  '      //     came from stays "main view" even though the map is covering it.',
  '      const unread = fact?.completionUnread',
  '      const previousUnread = lastUnread.get(sessionId)',
  '      if (typeof unread === \'boolean\') lastUnread.set(sessionId, unread)',
  '      if (finished.has(sessionId)) {',
  '        const readElsewhere = previousUnread === true && unread === false',
  '        const cameBackToIt = (row?.retainedBy?.mainView ?? 0) > 0',
  '          && (markedEpoch.get(sessionId) ?? panelEpoch) < panelEpoch',
  '        if (readElsewhere || cameBackToIt) {',
  '          finished.delete(sessionId)',
  '          markedEpoch.delete(sessionId)',
  '          changed = true',
  '        }',
  '      }',
])
if (!source.includes(oldRule)) {
  console.error('rule block not found')
  process.exit(1)
}
source = source.replace(oldRule, newRule)

// ---- stamp the epoch when a mark is created ---------------------------
source = source.replace(
  '      if (wasRunning === true && !finished.has(sessionId)) {\n        finished.add(sessionId)\n        changed = true\n      }',
  '      if (wasRunning === true && !finished.has(sessionId)) {\n        finished.add(sessionId)\n        markedEpoch.set(sessionId, panelEpoch)\n        changed = true\n      }',
)

fs.writeFileSync(file, source, 'utf8')
console.log('activity: epoch-aware release rule')
