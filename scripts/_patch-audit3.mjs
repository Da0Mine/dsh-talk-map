/** Measure how much of each arrow head is hidden behind a card. */
import fs from 'node:fs'

const file = 'scripts/_drawer-matrix.mjs'
let text = fs.readFileSync(file, 'utf8')

const oldInward = String.raw`          const normal = candidates[0].n
          inward = dir.x * normal.x + dir.y * normal.y
        }`

const newInward = String.raw`          const normal = candidates[0].n
          inward = dir.x * normal.x + dir.y * normal.y

          // How much of the arrow head is covered by a card? The wires are drawn behind
          // the cards, so a head that straddles a border loses half of itself and reads
          // as a backwards triangle.
          const glyph = [[0, 0], [-9, -4], [-9, 4]]
          let covered = 0
          let sampled = 0
          for (let i = 0; i <= 6; i += 1) {
            for (let j = 0; j <= 6; j += 1) {
              if (i + j > 6) continue
              const a = i / 6
              const b = j / 6
              const c = 1 - a - b
              const gx = glyph[0][0] * a + glyph[1][0] * b + glyph[2][0] * c
              const gy = glyph[0][1] * a + glyph[1][1] * b + glyph[2][1] * c
              const px = arrow.x + gx * Math.cos(radians) - gy * Math.sin(radians)
              const py = arrow.y + gx * Math.sin(radians) + gy * Math.cos(radians)
              sampled += 1
              for (const card of cards) {
                if (px > card.x && px < card.x + card.w && py > card.y && py < card.y + card.h) {
                  covered += 1
                  break
                }
              }
            }
          }
          arrowVisible = sampled === 0 ? null : Math.round((1 - covered / sampled) * 100) / 100
        }`

if (!text.includes(oldInward)) {
  console.log('inward anchor missing')
  process.exit(1)
}
text = text.replace(oldInward, newInward)

text = text.replace(
  "        let inward = null\n        if (target !== undefined && arrow !== undefined) {",
  "        let inward = null\n        let arrowVisible = null\n        if (target !== undefined && arrow !== undefined) {",
)

text = text.replace(
  "          inward: inward === null ? null : Math.round(inward * 100) / 100,\n          fromKnown: source !== undefined,",
  "          inward: inward === null ? null : Math.round(inward * 100) / 100,\n          arrowVisible,\n          fromKnown: source !== undefined,",
)

text = text.replace(
  "    || (wire.onEdge ?? 0) > 4 || (wire.inward ?? 1) <= 0.2)",
  "    || (wire.onEdge ?? 0) > 4 || (wire.inward ?? 1) <= 0.2 || (wire.arrowVisible ?? 1) < 0.85)",
)

text = text.replace(
  "detail: bad.slice(0, 3).map(wire => ({ from: wire.from, to: wire.to, cross: wire.cross, outside: wire.outside, onEdge: wire.onEdge, inward: wire.inward })),",
  "detail: bad.slice(0, 3).map(wire => ({ from: wire.from, to: wire.to, cross: wire.cross, outside: wire.outside, onEdge: wire.onEdge, inward: wire.inward, visible: wire.arrowVisible })),",
)
fs.writeFileSync(file, text, 'utf8')
console.log('arrow visibility audit added')
