/**
 * Static checks on the built client + stylesheet.
 *
 * Exactly TWO looks:
 *   未同步 = 灰白静态虚线
 *   同步中 = 灰白静态实线 + 一枚彗星沿路径跑（亮头 + 渐弱长尾 + 光晕），
 *            并且被裁剪在线身之内 —— 拐角处不会戳出去。
 * Everything is drawn by TalkMapEdge; the stylesheet carries no edge look at all.
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

// 3. the comet has a shape: tapered tail path + rounded head
assert.match(bundle, /M0 -1\.4 C -30 -3\.6/, 'the tapered tail path must exist')
assert.match(bundle, /rx: 34/, 'the body ellipse must exist')
assert.match(bundle, /rx: 5\.5/, 'the bright head must exist')

// 4. it follows the curve, nose first
assert.match(bundle, /rotate: "auto"/, 'the comet must orient along the tangent')
assert.match(bundle, /animateMotion/, 'the comet must ride the path')
assert.match(bundle, /keySplines/, 'the ride must be eased')

// 5. clipped into the line, so a corner cannot be overrun
assert.match(bundle, /maskUnits: "userSpaceOnUse"/, 'the corridor mask must be user-space')
assert.match(bundle, /CORRIDOR = 16/, 'the corridor width must be defined')

// 6. per-edge phase so parallel lines do not fly together
assert.match(bundle, /begin: `\$\{phase\}s`|begin: phase/, 'each edge needs its own phase')

// 7. grey-white base line, not gold
assert.match(bundle, /226, 232, 242/, 'the synced line must be grey-white')
assert.match(bundle, /200, 206, 216/, 'the unsynced line must be grey-white')

// 8. reduced motion removes the flying light entirely
assert.match(bundle, /prefersReducedMotion/, 'the component must respect reduced motion')

// 9. no leftover looks in the stylesheet
for (const gone of ['tmEdgeHead', 'tmEdgeMid', 'tmEdgeTail', 'tmEdgeComet', 'tmEdgeBloom', 'tmEdgeFlow', 'tmEdgeSweep']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' rule must be gone from the stylesheet')
}

console.log('edge-flow: 15 checks passed')
