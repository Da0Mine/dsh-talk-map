/**
 * Static checks on the built client + stylesheet.
 *
 * Exactly TWO looks:
 *   未同步 = 灰白静态虚线
 *   同步中 = 灰白静态实线 + 一枚彗星（亮头 + 渐弱尾 + 光晕层）沿路径流动
 * The line itself is drawn by the TalkMapEdge component (inline stroke over a
 * pathLength-normalised dash train), so CSS only carries the two animations.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bundle = fs.readFileSync('client/client.js', 'utf8')
const css = fs.readFileSync('src/client/talk-map.module.css', 'utf8')

// 1. every edge renders through the custom component
assert.match(bundle, /type: TALK_MAP_EDGE_TYPE/, 'edges must use the custom renderer')
assert.match(bundle, /edgeTypes=\{?\s*edgeTypes|edgeTypes:/, 'edgeTypes must be registered on ReactFlow')

// 2. synced = solid (no dasharray on the base path) + the comet layers
assert.match(bundle, /synced \? \{\} : \{ strokeDasharray/, 'only the unsynced line is dashed')
assert.match(bundle, /tmEdgeComet/, 'the comet layer must exist')
assert.match(bundle, /tmEdgeBloom/, 'the bloom layer must exist')

// 3. the comet is a tapering train, normalised to pathLength 100
assert.match(bundle, /pathLength: 100|pathLength=\{100\}/, 'layers must normalise to pathLength 100')
assert.match(bundle, /9 3 5 3 2\.5/, 'the dash train must taper (head, then shorter)')

// 4. one traversal per cycle: offset -100 over the whole loop, seamless
assert.match(css, /@keyframes tmEdgeTravel/, 'missing the travel keyframes')
assert.match(css, /stroke-dashoffset: -100/, 'one loop must be exactly one traversal')

// 5. per-edge phase, so parallel lines don't pulse in lockstep
assert.match(bundle, /animationDelay/, 'each edge needs its own phase')

// 6. grey-white base line, not gold
assert.match(bundle, /226, 232, 242/, 'the synced line must be grey-white')
assert.match(bundle, /200, 206, 216/, 'the unsynced line must be grey-white')

// 7. reduced motion keeps something on screen but stops it
assert.match(css, /prefers-reduced-motion: reduce[\s\S]{0,200}tmEdgeComet/, 'reduced motion must stop the comet')

// 8. no leftover looks
for (const gone of ['tmEdge-synced', 'tmEdge-idle', 'tmEdge-stale', 'tmEdge-far', 'tmEdge-lineage', 'tmEdgeFlow']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' rule must be gone from the stylesheet')
}

console.log('edge-flow: 12 checks passed')
