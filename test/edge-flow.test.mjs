/**
 * Static checks on the built client + stylesheet.
 *
 * Exactly TWO looks:
 *   未同步 = 灰白静态虚线
 *   同步中 = 灰白静态实线 + 一道连续的光带沿路径滑过（核心 + 光晕两条带）
 * The line and the light are both drawn by TalkMapEdge; CSS carries no look at all
 * any more, except the reduced-motion fallback.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bundle = fs.readFileSync('client/client.js', 'utf8')
const css = fs.readFileSync('src/client/talk-map.module.css', 'utf8')

// 1. every edge renders through the custom component
assert.match(bundle, /type: TALK_MAP_EDGE_TYPE/, 'edges must use the custom renderer')
assert.match(bundle, /edgeTypes=\{?\s*edgeTypes|edgeTypes:/, 'edgeTypes must be registered on ReactFlow')

// 2. unsynced is the only dashed line
assert.match(bundle, /synced \? \{\} : \{ strokeDasharray/, 'only the unsynced line is dashed')

// 3. two travelling bands, percent-of-path lengths
assert.match(bundle, /var CORE = \{ len: 12/, "the bright core band must exist")
assert.match(bundle, /var HALO = \{ len: 20/, "the soft halo band must exist")
assert.match(bundle, /pathLength: 100|pathLength=\{100\}/, 'bands must be percent-of-path')

// 4. motion is SMIL on the dash offset, with an eased ride
assert.match(bundle, /attributeName: "stroke-dashoffset"/, 'the band must move by dash offset')
assert.match(bundle, /keySplines/, 'the ride must be eased, not linear')

// 5. per-edge phase so parallel lines do not sweep together
assert.match(bundle, /begin: `\$\{phase\}s`|begin: phase/, 'each edge needs its own phase')

// 6. grey-white base line, not gold
assert.match(bundle, /226, 232, 242/, 'the synced line must be grey-white')
assert.match(bundle, /200, 206, 216/, 'the unsynced line must be grey-white')

// 7. reduced motion removes the travelling light entirely
assert.match(bundle, /prefersReducedMotion/, 'the component must respect reduced motion')

// 8. no leftover band-aids in the stylesheet
for (const gone of ['tmEdgeHead', 'tmEdgeMid', 'tmEdgeTail', 'tmEdgeComet', 'tmEdgeBloom', 'tmEdgeFlow', 'tmEdgeSweep']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' rule must be gone from the stylesheet')
}

console.log('edge-flow: 12 checks passed')
