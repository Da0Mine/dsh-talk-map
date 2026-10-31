/**
 * Probe: drawer wires must be orthogonal (same smoothstep geometry as the map),
 * so their path data must not contain bezier segments.
 */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')

const anchor = lines.findIndex(line => line.includes("check('抽屉里的连线不超过画布上可见的连线'"))
if (anchor < 0) {
  console.error('invariant anchor missing')
  process.exit(1)
}
// find the end of that multi-line check call
let end = anchor
while (end < lines.length && !lines[end].trim().endsWith('))')) end += 1

const block = [
  '',
  '  // Same geometry as the board: a right-angle smoothstep path, no bezier bow.',
  '  const wireShapes = await page.evaluate(() => {',
  '    const paths = [...document.querySelectorAll(\'svg[class*="drawerWires"] path\')]',
  '      .filter(path => (path.getAttribute(\'stroke-dasharray\') ?? \'\') !== \'\')',
  '    return {',
  '      count: paths.length,',
  '      curved: paths.filter(path => /[CQ]/.test(path.getAttribute(\'d\') ?? \'\')).length,',
  '    }',
  '  })',
  "  check('抽屉里的连线是折线（与画布同一算法，不是贝塞尔弯的）',",
  '    wireShapes.curved === 0, JSON.stringify(wireShapes))',
  '',
]

const out = [...lines.slice(0, end + 1), ...block, ...lines.slice(end + 1)]
fs.writeFileSync(file, out.join('\n'), 'utf8')
console.log('orthogonality check added')
