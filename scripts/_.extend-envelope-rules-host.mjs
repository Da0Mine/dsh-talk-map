/**
 * One-off: extend the envelope rules inside the hand-patched built host bundle
 * (lib/index.js). Same rules as src/host/routes.ts and src/client/preview-text.ts.
 * Idempotent.
 */
import fs from 'node:fs'

const file = new URL('../lib/index.js', import.meta.url)
let text = fs.readFileSync(file, 'utf8')

if (text.includes('automatically generated checkpoint')) {
  console.log('already applied')
  process.exit(0)
}

const markerTail = '/^\\[dsh-mnemon:/i]'
if (!text.includes(markerTail)) {
  console.error('marker tail not found')
  process.exit(1)
}
text = text.replace(
  markerTail,
  '/^\\[dsh-mnemon:/i, /^\\[[a-z][^\\]]{0,90}\\]/i, /^this is an automatically generated checkpoint/i, /^the approval policy changed/i, /^\\(empty message\\)/i]',
)

const patternAnchor = '\tout = out.replace(/^\\s*The available skill catalog changed[\\s\\S]*$/im, " ");'
if (!text.includes(patternAnchor)) {
  console.error('pattern anchor not found')
  process.exit(1)
}
text = text.replace(patternAnchor, [
  patternAnchor,
  '\tout = out.replace(/^\\[[a-z][^\\]]{0,90}\\]/i, " ");',
  '\tout = out.replace(/^This is an automatically generated checkpoint[\\s\\S]*$/im, " ");',
  '\tout = out.replace(/^The approval policy changed[\\s\\S]*$/im, " ");',
].join('\n'))

fs.writeFileSync(file, text, 'utf8')
console.log('host bundle: envelope rules extended')
