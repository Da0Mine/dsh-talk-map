/**
 * Static checks on the built client + stylesheet: there are exactly TWO line
 * looks, and nothing inline can override them.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bundle = fs.readFileSync('client/client.js', 'utf8')
const css = fs.readFileSync('src/client/talk-map.module.css', 'utf8')

// 1. every edge is either 同步中 or 没同步 — no third class
assert.match(bundle, /tmEdge-synced" : "tmEdge-idle/, "edges must only choose between synced and idle")

// 2. the stylesheet defines exactly those two looks
assert.match(css, /\.tmEdge path\.react-flow__edge-path\) \{[\s\S]{0,200}stroke-dasharray/, 'idle edges are dashed')
assert.match(css, /tmEdge-synced[^{]*\{[^}]*animation: tmFlow/, 'synced edges run the packet')
for (const gone of ['tmEdge-stale', 'tmEdge-far', 'tmEdge-lineage']) {
  assert.ok(!css.includes(gone), 'the ' + gone + ' look must be gone from the stylesheet')
}

// 3. no inline stroke on any edge: inline style beats the class
assert.ok(!/style: \{ strokeDasharray/.test(bundle), 'an inline dasharray would override the class')

// 4. reduced motion keeps the colour but stops the packet
assert.match(css, /prefers-reduced-motion: reduce[\s\S]{0,200}tmEdge-synced/, 'reduced motion must stop the flow')

// 5. the menu no longer explains itself
assert.ok(!bundle.includes('edge.lineageTitle'), 'the explanatory menu row must be gone')
assert.ok(!bundle.includes('edge.lineageHint'), 'the explanatory hint must be gone')

// 6. a lineage line can still become a real edge (auto push lives there)
assert.match(bundle, /materialiseEdge/, 'lineage lines must be able to materialise an edge')

console.log('edge-flow: 11 checks passed')
