/**
 * In the 80-scene matrix, also check that each edge's arrow head points into its card:
 * the angle must be the one the target face requires.
 */
import fs from 'node:fs'

const file = 'scripts/_component-matrix.mjs'
let text = fs.readFileSync(file, 'utf8')

const anchor = "    const inside = 0"
if (!text.includes(anchor)) {
  console.log('inside anchor missing, looking for the measurement block')
  process.exit(1)
}

// Extend the per-scene evaluation with the arrow check.
const marker = "    for (let distance = 0; distance <= total; distance += 2) {"
if (!text.includes(marker)) {
  console.log('distance loop anchor missing')
  process.exit(1)
}

text = text.replace(
  marker,
  "    // The head is a separate path; its rotate() must be the one the target face needs.\n" +
  "    const expected = { right: 180, left: 0, top: 90, bottom: -90 }[scene.getAttribute('data-target-position') ?? 'left']\n" +
  "    const headElement = [...scene.querySelectorAll('svg path')]\n" +
  "      .find(element => (element.getAttribute('d') ?? '').startsWith('M0 0'))\n" +
  "    const rotateMatch = /rotate\\(([-\\d.]+)\\)/.exec(headElement?.getAttribute('transform') ?? '')\n" +
  "    const arrowAngle = rotateMatch === null ? null : Number(rotateMatch[1])\n" +
  "    const arrowOk = expected === undefined || arrowAngle === expected\n\n" +
  marker,
)

text = text.replace(
  "    out.push({ key, inside, hits: [...hits], d: pathElement.getAttribute('d')?.slice(0, 90) })",
  "    out.push({ key, inside, hits: [...hits], arrowAngle, expected, arrowOk, d: pathElement.getAttribute('d')?.slice(0, 90) })",
)

text = text.replace(
  "const bad = report.filter(crossing => crossing.inside > 0)",
  "const bad = report.filter(crossing => crossing.inside > 0 || crossing.arrowOk === false)",
)

fs.writeFileSync(file, text, 'utf8')
console.log('arrow check added to the component matrix')
