/**
 * Static checks on the built client + stylesheet.
 *
 * Exactly TWO looks:
 *   未同步 = 灰白静态虚线
 *   同步中 = 灰白静态实线 + 一道流光沿路径滑过（亮头 + 渐弱的尾，多层叠加）
 * The line itself is drawn by the TalkMapEdge component; CSS only carries the
 * sweep — each layer travels from its own length to 0, which reads as one
 * continuous band moving head-first down the line.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bundle = fs.readFileSync('client/client.js', 'utf8')
const css = fs.readFileSync('src/client/talk-map.module.css', 'utf8')

// 1. every edge renders through the custom component
assert.match(bundle, /type: TALK_MAP_EDGE_TYPE/, 'edges must use the custom renderer')
assert.match(bundle, /edgeTypes=\{?\s*edgeTypes|edgeTypes:/, 'edgeTypes must be registered on ReactFlow')

// 2. synced = solid base line + the three sweep layers
assert.match(bundle, /synced \? \{\} : \{ strokeDasharray/, 'only the unsynced line is dashed')
for (const layer of ['tmEdgeHead', 'tmEdgeMid', 'tmEdgeTail']) {
  assert.match(bundle, new RegExp(layer), 'the ' + layer + ' layer must exist')
}

// 3. layered intensities: long+dim tail, short+bright head
assert.match(bundle, /len: 30/, 'the tail must be the longest layer')
assert.match(bundle, /len: 7/, 'the head must be the shortest layer')

// 4. normalised travel: each layer's dash spans exactly its own length
assert.match(bundle, /100 - layer\.len/, 'each dash must cover exactly its layer length')
assert.match(css, /stroke-dashoffset: var\(--edge-dash/, 'the sweep must start at each layer own length')

// 5. per-edge phase
assert.match(bundle, /animationDelay/, 'each edge needs its own phase')

// 6. grey-white base line, not gold
assert.match(bundle, /226, 232, 242/, 'the synced line must be grey-white')
assert.match(bundle, /200, 206, 216/, 'the unsynced line must be grey-white')

// 7. reduced motion keeps something on screen but stops it
assert.match(css, /prefers-reduced-motion: reduce[\s\S]{0,240}tmEdgeHead/, 'reduced motion must stop the sweep')

// 8. no leftover looks
for (const gone of ['tmEdge-synced', 'tmEdge-idle', 'tmEdge-stale', 'tmEdge-far', 'tmEdge-lineage', 'tmEdgeFlow', 'tmEdgeComet', 'tmEdgeBloom']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' rule must be gone from the stylesheet')
}

console.log('edge-flow: 12 checks passed')
