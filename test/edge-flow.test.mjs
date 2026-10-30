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

// 7. lineage lines get a state class too, and never animate the packet
assert.match(bundle, /tmEdge-\$\{lineageSync\}/, 'lineage edges must carry a state class')
assert.match(css, /tmEdge-lineage[\s\S]{0,200}animation: none/, 'lineage lines must not run the packet')

// 8. a lineage push is recorded by card PAIR, so the line gets a state after it
assert.match(bundle, /stampPush\(fromCardId, toCardId\)/, 'a push must record the pair')
assert.match(bundle, /lastPushOf\(parentCardId, cardId\)/, 'lineage lines must read the pair log')
assert.match(bundle, /setPushEpoch/, 'a push must repaint the edges')

// 9. lineage lines are selectable, explainable and switchable
assert.match(bundle, /edge\.lineageTitle/, 'the edge menu must name a lineage line')
assert.match(bundle, /edge\.hideLineage/, 'the edge menu must offer hiding it')
assert.match(bundle, /edge\.showLineage/, 'the canvas menu must offer bringing it back')
assert.match(bundle, /lineage-hidden\.v1/, 'the choice must be remembered')
assert.match(bundle, /if \(!lineageHidden\)/, 'hidden lineage lines must not be painted')

// 10. one menu for both kinds of line — and the lineage class never disappears
assert.match(bundle, /tmEdge-\$\{lineageSync\} tmEdge-lineage/, 'the lineage class must be unconditional')
assert.match(bundle, /materialiseEdge/, 'a lineage line must be able to become a real edge')
assert.match(bundle, /const lineage = stored === void 0/, 'the edge menu must branch on lineage, not skip items')

console.log('edge-flow: 22 checks passed')
