/**
 * Probe invariant: the drawer must never invent lines the board is not showing.
 * (That was the bug: 日常任务 had no visible line on the board, yet the drawer
 * drew one.)
 */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')

const anchor = lines.findIndex(line => line.includes("probe-drawer.png'"))
if (anchor < 0) {
  console.error('drawer screenshot line missing')
  process.exit(1)
}

const block = [
  '',
  '  // The drawer derives its wires from liveEdges, so it can never show more',
  '  // lines than the board actually paints.',
  '  const wireConsistency = await page.evaluate(() => {',
  '    const wires = document.querySelectorAll(\'svg[class*="drawerWires"] path\').length',
  '    const boardLines = [...document.querySelectorAll(\'.react-flow__edge-path\')]',
  '      .filter(path => Number(getComputedStyle(path).opacity) > 0.5).length',
  '    return { wires, boardLines }',
  '  })',
  "  check('抽屉里的连线不超过画布上可见的连线', wireConsistency.wires <= wireConsistency.boardLines,",
  '    JSON.stringify(wireConsistency))',
  '',
]

const out = [...lines.slice(0, anchor), ...block, ...lines.slice(anchor)]
fs.writeFileSync(file, out.join('\n'), 'utf8')
console.log('wire consistency check added')
