/**
 * Drawer wires follow the map's routing rule: when two cards are too close, the
 * line leaves through a top/bottom face and loops, instead of a 48px stub.
 */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

const oldBlock = [
  '        let x1: number',
  '        let y1: number',
  '        let x2: number',
  '        let y2: number',
  '        let bend: number',
  '        if (Math.abs(dx) >= Math.abs(dy)) {',
  '          // Side by side: leave the facing edges, curve horizontally.',
  '          x1 = dx >= 0 ? from.x + from.width : from.x',
  '          y1 = fromCy',
  '          x2 = dx >= 0 ? to.x : to.x + to.width',
  '          y2 = toCy',
  '          bend = Math.max(24, Math.min(96, Math.abs(x2 - x1) * 0.55))',
  '          const sign = dx >= 0 ? 1 : -1',
  '          next.push({',
  '            d: `M ${x1} ${y1} C ${x1 + bend * sign} ${y1}, ${x2 - bend * sign} ${y2}, ${x2} ${y2}`,',
  '            ax: x2,',
  '            ay: y2,',
  '            angle: dx >= 0 ? 0 : 180,',
  '          })',
  '        } else {',
  '          // Stacked: leave the top/bottom edges, curve vertically.',
  '          x1 = fromCx',
  '          y1 = dy >= 0 ? from.y + from.height : from.y',
  '          x2 = toCx',
  '          y2 = dy >= 0 ? to.y : to.y + to.height',
  '          bend = Math.max(24, Math.min(72, Math.abs(y2 - y1) * 0.55))',
  '          const sign = dy >= 0 ? 1 : -1',
  '          next.push({',
  '            d: `M ${x1} ${y1} C ${x1} ${y1 + bend * sign}, ${x2} ${y2 - bend * sign}, ${x2} ${y2}`,',
  '            ax: x2,',
  '            ay: y2,',
  '            angle: dy >= 0 ? 90 : -90,',
  '          })',
  '        }',
].join(D)

const newBlock = [
  '        // Same rule as the map: a facing-side line needs room to read as a',
  '        // line. Narrower than that and it leaves through a top/bottom face and',
  '        // loops around instead of becoming a 20px stub.',
  '        const gapX = Math.abs(dx) - (from.width + to.width) / 2',
  '        const gapY = Math.abs(dy) - (from.height + to.height) / 2',
  '        const MIN_SPAN = 96',
  '        const horizontalDominant = Math.abs(dx) >= Math.abs(dy)',
  '',
  '        if (horizontalDominant && gapX >= MIN_SPAN) {',
  '          // Side by side with room: leave the facing edges.',
  '          const x1 = dx >= 0 ? from.x + from.width : from.x',
  '          const x2 = dx >= 0 ? to.x : to.x + to.width',
  '          const bend = Math.max(24, Math.min(96, Math.abs(x2 - x1) * 0.55))',
  '          const sign = dx >= 0 ? 1 : -1',
  '          next.push({',
  '            d: `M ${x1} ${fromCy} C ${x1 + bend * sign} ${fromCy}, ${x2 - bend * sign} ${toCy}, ${x2} ${toCy}`,',
  '            ax: x2,',
  '            ay: toCy,',
  '            angle: dx >= 0 ? 0 : 180,',
  '          })',
  '        } else if (!horizontalDominant && gapY >= MIN_SPAN) {',
  '          // Stacked with room: leave the facing edges.',
  '          const y1 = dy >= 0 ? from.y + from.height : from.y',
  '          const y2 = dy >= 0 ? to.y : to.y + to.height',
  '          const bend = Math.max(24, Math.min(72, Math.abs(y2 - y1) * 0.55))',
  '          const sign = dy >= 0 ? 1 : -1',
  '          next.push({',
  '            d: `M ${fromCx} ${y1} C ${fromCx} ${y1 + bend * sign}, ${toCx} ${y2 - bend * sign}, ${toCx} ${y2}`,',
  '            ax: toCx,',
  '            ay: y2,',
  '            angle: dy >= 0 ? 90 : -90,',
  '          })',
  '        } else {',
  '          // Too close: drop out of the bottom (or top) of both cards and loop.',
  '          const down = from.y + from.height <= to.y + to.height',
  '          const y1 = down ? from.y + from.height : from.y',
  '          const y2 = down ? to.y + to.height : to.y',
  '          const dip = 26',
  '          const sign = down ? 1 : -1',
  '          next.push({',
  '            d: `M ${fromCx} ${y1} C ${fromCx} ${y1 + dip * sign}, ${toCx} ${y2 + dip * sign}, ${toCx} ${y2}`,',
  '            ax: toCx,',
  '            ay: y2,',
  '            angle: down ? -90 : 90,',
  '          })',
  '        }',
].join(D)

if (!source.includes(oldBlock)) {
  console.error('wire geometry block not found')
  process.exit(1)
}
source = source.replace(oldBlock, newBlock)

// unused locals now
source = source.replace(/\n {8}let x1: number\n {8}let y1: number\n {8}let x2: number\n {8}let y2: number\n {8}let bend: number/, '')

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('drawer routing: same rule as the map')
