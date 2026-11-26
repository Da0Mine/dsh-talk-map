import fs from 'node:fs'
// MapCanvas 传 pinned 给 StatusRail
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('pinned={pinnedSessions}')) {
  t = t.replace(
    `        currentSessionId={currentSessionId() ?? mainViewSessionId}`,
    `        currentSessionId={currentSessionId() ?? mainViewSessionId}
        pinned={pinnedSessions}`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: pinned 传给 rail')
}
