import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.trim() === '<ReactFlow')
if (at < 0) throw new Error('<ReactFlow not found')
const indent = lines[at].match(/^\s*/)[0]
if (lines.some(l => l.includes('onlyRenderVisibleElements'))) { console.log('已存在'); process.exit(0) }
lines.splice(at + 1, 0,
  indent + '  // A board with hundreds of cards must not mount them all: only the viewport (plus',
  indent + '  // React Flow\'s own buffer) is rendered. Below the threshold nothing changes.',
  indent + '  onlyRenderVisibleElements={Object.keys(visibleCards).length > 120}',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('ReactFlow: onlyRenderVisibleElements 已启用（>120 张时）')
