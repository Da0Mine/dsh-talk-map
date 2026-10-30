/**
 * Static checks on the built client: the sync animation is wired end to end.
 * (The probe cannot see it — the fixture edge hangs on folded cards, so React
 * Flow paints no edge in the DOM.)
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'

const bundle = fs.readFileSync('client/client.js', 'utf8')
const css = fs.readFileSync('src/client/talk-map.module.css', 'utf8')

// 1. every edge gets a state class
assert.match(bundle, /tmEdge tmEdge-/, 'edges must carry a sync state class')

// 2. the three states exist and are styled
for (const state of ['synced', 'stale', 'far']) {
  assert.match(css, new RegExp(`tmEdge-${state} path\\.react-flow__edge-path`), `missing style for ${state}`)
}

// 3. synced = a moving packet; stale/far = a glowing line, no flow
assert.match(css, /tmEdge-synced[^{]*\{[^}]*animation: tmFlow/, 'synced edges must animate the dash')
assert.match(css, /@keyframes tmFlow/, 'missing the flow keyframes')
assert.match(css, /tmEdge-stale[^{]*\{[^}]*drop-shadow/, 'stale edges must glow amber')
assert.match(css, /tmEdge-far[^{]*\{[^}]*242, 78, 78/, 'far edges must glow red')

// 4. reduced motion turns it all off
assert.match(css, /prefers-reduced-motion: reduce[\s\S]{0,400}tmEdge-synced/, 'reduced motion must disable the flow')

// 5. the arrow colour follows the state
assert.match(bundle, /sync === .far./, 'the arrow must know about the far state')
assert.match(bundle, /242, 78, 78/, 'the far arrow must be red')

// 6. a push stamps the edge, which is what the animation reads
assert.match(bundle, /lastPushAt: pushedAt/, 'a manual push must stamp the edge')

console.log('edge-flow: 9 checks passed')
