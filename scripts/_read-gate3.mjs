import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const at = lines.findIndex(line => line.trim() === 'if (listed.has(card.sessionId)) continue')
if (at < 0) throw new Error('anchor not found')
if (!(lines[at + 1] ?? '').includes('readFinished.has')) {
  const indent = (lines[at].match(/^\s*/) ?? [''])[0]
  lines.splice(at + 1, 0,
    `${indent}// 「最近的任务」= 任务中 → 待查看 → 看过；没走完这条链的不入列。`,
    `${indent}if (!readFinished.has(card.sessionId)) continue`,
  )
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('MapCanvas: 门槛插入到第', at + 2, '行')
}
