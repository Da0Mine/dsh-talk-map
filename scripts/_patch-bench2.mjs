import fs from 'node:fs'
const f = 'scripts/_bench-drag.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  const sorted = [...window.__frames].sort((a, b) => a - b)`,
  `  // Frame timestamps tell us whether the spikes are periodic (a poll) or input-driven.
  const spikes = []
  let clock = 0
  for (const value of window.__frames) {
    clock += value
    if (value > 50) spikes.push(Math.round(clock))
  }
  const gaps = spikes.slice(1).map((value, index) => value - spikes[index])
  const sorted = [...window.__frames].sort((a, b) => a - b)`,
)
t = t.replace(
  `    frame: { frames: result.frames, median: result.median, p95: result.p95, worst: result.worst },`,
  `    frame: { frames: result.frames, median: result.median, p95: result.p95, worst: result.worst },
  spikesAtMs: result.spikes,
  spikeGapsMs: result.gaps,`,
)
t = t.replace(
  `    frames: window.__frames.length,`,
  `    frames: window.__frames.length,
    spikes,
    gaps,`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('bench: spike timestamps added')
