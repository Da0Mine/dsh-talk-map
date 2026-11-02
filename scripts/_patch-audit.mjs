/** Audit: pair each arrow to its wire by position, and measure wire-vs-wire overlap. */
import fs from 'node:fs'

const file = 'scripts/_drawer-matrix.mjs'
let text = fs.readFileSync(file, 'utf8')

const oldPair = String.raw`        const tip = wire.points[wire.points.length - 1]
        const arrow = arrows[index]`
const newPair = String.raw`        const tip = wire.points[wire.points.length - 1]
        // Match the arrow head by position: the DOM order of heads and paths is not
        // guaranteed, and pairing by index validated the wrong glyph.
        let arrow = arrows[index]
        let nearest = Number.POSITIVE_INFINITY
        for (const candidate of arrows) {
          const distance = Math.hypot(candidate.x - tip.x, candidate.y - tip.y)
          if (distance < nearest) { nearest = distance; arrow = candidate }
        }
        if (nearest > 2) arrow = undefined`

if (!text.includes(oldPair)) {
  console.log('pair anchor missing')
  process.exit(1)
}
text = text.replace(oldPair, newPair)

// overlap check across wires
const oldReturn = String.raw`          onEdge: onEdge === null ? null : Math.round(onEdge * 10) / 10,
          inward: inward === null ? null : Math.round(inward * 100) / 100,
          fromKnown: source !== undefined,`
const newReturn = String.raw`          onEdge: onEdge === null ? null : Math.round(onEdge * 10) / 10,
          inward: inward === null ? null : Math.round(inward * 100) / 100,
          fromKnown: source !== undefined,
          points: wire.points.filter((_point, at) => at % 4 === 0).map(point => [point.x, point.y]),`

if (!text.includes(oldReturn)) {
  console.log('return anchor missing')
  process.exit(1)
}
text = text.replace(oldReturn, newReturn)

// after wires are built, compute overlaps
const oldClose = String.raw`    return {
      panel,
      cards,`
const newClose = String.raw`    const wireList = wires
    const overlapPairs = []
    for (let a = 0; a < wireList.length; a += 1) {
      for (let b = a + 1; b < wireList.length; b += 1) {
        let close = 0
        for (const pointA of wireList[a].points) {
          for (const pointB of wireList[b].points) {
            if (Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) < 1.6) { close += 1; break }
          }
        }
        if (close >= wireList[a].points.length * 0.5) {
          overlapPairs.push({ a: wireList[a].from + '>' + wireList[a].to, b: wireList[b].from + '>' + wireList[b].to, close })
        }
      }
    }

    return {
      panel,
      cards,
      overlapPairs,`

if (!text.includes(oldClose)) {
  console.log('close anchor missing')
  process.exit(1)
}
text = text.replace(oldClose, newClose)

// fold overlap into the summary
text = text.replace(
  "  const bad = result.wires.filter(wire => wire.cross > 0 || wire.outside > 0\n    || (wire.onEdge ?? 0) > 2 || (wire.inward ?? 1) <= 0.2)",
  "  const bad = result.wires.filter(wire => wire.cross > 0 || wire.outside > 0\n    || (wire.onEdge ?? 0) > 2 || (wire.inward ?? 1) <= 0.2)\n  const overlaps = (result.overlapPairs ?? []).length",
)
text = text.replace(
  "    bad: bad.length,",
  "    bad: bad.length,\n    overlaps,",
)
text = text.replace(
  "process.exitCode = summary.every(entry => entry.bad === 0) ? 0 : 1",
  "process.exitCode = summary.every(entry => entry.bad === 0 && (entry.overlaps ?? 0) === 0) ? 0 : 1",
)
fs.writeFileSync(file, text, 'utf8')
console.log('audit patched')
