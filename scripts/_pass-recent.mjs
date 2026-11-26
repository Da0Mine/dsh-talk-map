import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = `      <StatusRail
        entries={statusEntries}
        cardWidth={CARD_W}
        onFocus={focusCard}
        onOpen={openRailCard}
      />`
const after = `      <StatusRail
        entries={statusEntries}
        cardWidth={CARD_W}
        onFocus={focusCard}
        onOpen={openRailCard}
        recent={recentEntries}
        currentSessionId={currentSessionId()}
      />`
if (!t.includes(before)) throw new Error('StatusRail JSX anchor missing')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: 传入 recent / currentSessionId')
