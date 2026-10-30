/**
 * Static checks on the built client + stylesheet.
 *
 * Exactly TWO looks:
 *   未同步 = 灰白静态虚线
 *   同步中 = 同样灰白、静态实线 + 一串光点沿路径流动
 * The line itself is drawn by the TalkMapEdge component (inline stroke), so the
 * only thing left in CSS is the packet animation — assert both halves.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bundle = fs.readFileSync('client/client.js', 'utf8')
const css = fs.readFileSync('src/client/talk-map.module.css', 'utf8')

// 1. every edge renders through the custom component
assert.match(bundle, /type: TALK_MAP_EDGE_TYPE/, 'edges must use the custom renderer')
assert.match(bundle, /edgeTypes=\{?\s*edgeTypes|edgeTypes:/, 'edgeTypes must be registered on ReactFlow')

// 2. synced = solid (no dasharray on the base path) + a flowing dot layer
assert.match(bundle, /synced \? \{\} : \{ strokeDasharray/, 'only the unsynced line is dashed')
assert.match(bundle, /strokeDasharray"?: ?"0 16"|strokeDasharray: "0 16"/, 'the packet must be round dots')
assert.match(css, /@keyframes tmEdgeFlow/, 'missing the packet keyframes')
assert.match(css, /\.tmEdgeFlow[^{]*\{[^}]*animation: tmEdgeFlow/, 'the packet must animate')

// 3. grey-white, not gold
assert.match(bundle, /232, 236, 244/, 'the synced line must be grey-white')
assert.match(bundle, /200, 206, 216/, 'the unsynced line must be grey-white')

// 4. no leftover gold/red line looks
for (const gone of ['tmEdge-synced', 'tmEdge-idle', 'tmEdge-stale', 'tmEdge-far', 'tmEdge-lineage']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' rule must be gone from the stylesheet')
}

// 5. reduced motion keeps the dots on screen but stops them
assert.match(css, /prefers-reduced-motion: reduce[\s\S]{0,160}tmEdgeFlow/, 'reduced motion must stop the packet')

// 6. the menu no longer explains itself
assert.ok(!bundle.includes('edge.lineageTitle'), 'the explanatory menu row must be gone')

console.log('edge-flow: 10 checks passed')