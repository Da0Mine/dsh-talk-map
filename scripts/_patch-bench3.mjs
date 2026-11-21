import fs from 'node:fs'
const f = 'scripts/_bench-drag.mjs'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.trim().startsWith('frame: { frames: result.frames'))
if (at < 0) throw new Error('frame line missing')
lines.splice(at + 1, 0, '  spikesAtMs: result.spikes,', '  spikeGapsMs: result.gaps,')
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('output keys added after line', at + 1)
