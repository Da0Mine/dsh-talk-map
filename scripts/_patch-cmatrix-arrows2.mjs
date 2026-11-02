/** Add the arrow-direction assertion to the 80-scene component matrix. */
import fs from 'node:fs'

const file = 'scripts/_component-matrix.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// 1) expose the target face on the scene element
const sceneLine = lines.findIndex(line => line.includes('data-scene={index}'))
if (sceneLine < 0) { console.log('scene line missing'); process.exit(1) }
lines[sceneLine] = lines[sceneLine].replace('data-scene={index}', 'data-scene={index} data-target={scene.props.targetPosition}')
const arrow = lines[sceneLine + 1].includes('width: CELL_W - PAD') ? null : null

// 2) compute the arrow verdict right before pushing the result
const pushLine = lines.findIndex(line => line.includes("out.push({ key, inside, hits: [...hits], d:"))
if (pushLine < 0) { console.log('push line missing'); process.exit(1) }

const expected = {
  right: 180,
  left: 0,
  top: 90,
  bottom: -90,
}
const block = [
  '      // The head is its own path; its rotate() must be the one the target face needs.',
  "      const face = scene.getAttribute('data-target') ?? 'left'",
  '      const expectedAngle = ' + JSON.stringify(expected) + '[face]',
  "      const headElement = [...scene.querySelectorAll('svg path')].find(element => (element.getAttribute('d') ?? '').startsWith('M0 0'))",
  "      const rotateMatch = /rotate\\(([-\\d.]+)\\)/.exec(headElement === undefined ? '' : (headElement.getAttribute('transform') ?? ''))",
  '      const arrowAngle = rotateMatch === null ? null : Number(rotateMatch[1])',
  '      const arrowOk = expectedAngle === undefined || arrowAngle === expectedAngle',
]
lines.splice(pushLine, 0, ...block)
lines[pushLine + block.length] = lines[pushLine + block.length]
  .replace('out.push({ key, inside, hits: [...hits], d:', 'out.push({ key, inside, hits: [...hits], face, arrowAngle, expectedAngle, arrowOk, d:')

// 3) count arrow failures as failures
const badLine = lines.findIndex(line => line.includes('const bad = report.filter'))
if (badLine >= 0) {
  lines[badLine] = "  const bad = report.filter(crossing => crossing.inside > 0 || crossing.arrowOk === false)"
}
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('arrow assertion added')
