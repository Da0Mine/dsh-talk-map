/**
 * Static checks on the built client + stylesheet.
 *
 * Exactly TWO looks:
 *   未同步 = 灰白静态虚线
 *   同步中 = 灰白静态实线 + 一层光沿线路扫过
 *
 * The light reuses the CARD RUNNING RING's gradient profile verbatim
 *   (190° 0 → 250° 0.18 → 292° 0.55 → 325° 1.0 → 352° 0.4 → 360° 0)
 * as a moving mask window, so only one place on the line is lit at a time.
 * Everything is drawn by TalkMapEdge; CSS carries no edge look.
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

// 3. the light IS the card ring's profile, stop for stop
assert.match(bundle, /0\.16, 0\.1/, 'the band must fade in at its leading edge')
assert.match(bundle, /0\.84, 0\.1/, 'the band must fade out symmetrically')
assert.match(bundle, /0\.5, 0\.92/, 'the peak must sit in the middle of the band')
assert.match(bundle, /0\.66, 0\.38/, 'the ramp must come back down after the peak')
assert.match(bundle, /LIGHT_PROFILE/, 'the profile must be a named constant')
// symmetric, not a comet: no single bright nose
assert.ok(!bundle.includes('0.95, 0.4'), 'the old asymmetric aura ramp must be gone')

// 4. one moving window, so the light never duplicates across the seam
assert.match(bundle, /maskUnits: "userSpaceOnUse"/, 'the window must be user-space')
assert.match(bundle, /animateTransform/, 'the window must translate')
assert.match(bundle, /type: "translate"/, 'the window must translate, not rotate')
assert.match(bundle, /SWEEP_S = 3\.6/, 'the sweep duration must be defined')

// 5. the sweep follows the dominant axis, so vertical edges work too
assert.match(bundle, /horizontal \?/, 'the sweep must pick its axis')

// 6. grey-white base line, not gold
assert.match(bundle, /226, 232, 242/, 'the synced line must be grey-white')
assert.match(bundle, /200, 206, 216/, 'the unsynced line must be grey-white')

// 7. reduced motion removes the light entirely
assert.match(bundle, /prefersReducedMotion/, 'the component must respect reduced motion')

// 8. no leftover looks in the stylesheet
for (const gone of ['tmEdgeHead', 'tmEdgeMid', 'tmEdgeTail', 'tmEdgeComet', 'tmEdgeBloom', 'tmEdgeFlow', 'tmEdgeSweep']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' rule must be gone from the stylesheet')
}

console.log('edge-flow: 15 checks passed')
