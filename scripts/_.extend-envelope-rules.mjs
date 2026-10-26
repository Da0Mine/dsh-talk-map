/**
 * One-off: extend the envelope rules in all three places (client, src host, the
 * hand-patched built host bundle) with the shapes found by scanning every stored
 * session: `[MNEMON] …`, `[model changed: …]`, the auto-generated checkpoint
 * blurb, the approval-policy notice, and `(empty message)`.
 *
 * The bracketed form is matched GENERALLY (`^[ascii-tag]`), because DSH keeps
 * inventing tags; a human message essentially never starts with an ASCII tag in
 * square brackets.
 */
import fs from 'node:fs'

function patch(file, { markerAnchor, patternsAnchor, markerLines, patternLines }) {
  let text = fs.readFileSync(file, 'utf8')
  if (text.includes('automatically generated checkpoint')) {
    console.log(file, '→ already applied')
    return
  }
  if (!text.includes(markerAnchor)) {
    console.error(file, '→ marker anchor missing')
    process.exit(1)
  }
  text = text.replace(markerAnchor, markerLines + markerAnchor)
  if (!text.includes(patternsAnchor)) {
    console.error(file, '→ patterns anchor missing')
    process.exit(1)
  }
  text = text.replace(patternsAnchor, patternLines + patternsAnchor)
  fs.writeFileSync(file, text, 'utf8')
  console.log(file, '→ patched')
}

const markerLinesTs = [
  '  // Shapes found by scanning every stored session (2026-10-26):',
  '  /^\\[[a-z][^\\]]{0,90}\\]/i,          // [MNEMON] …, [model changed: …], [dsh-mnemon: …]',
  '  /^this is an automatically generated checkpoint/i,',
  '  /^the approval policy changed/i,',
  '  /^\\(empty message\\)/i,',
].join('\n') + '\n'

const patternLinesTs = [
  '  [/^\\[[a-z][^\\]]{0,90}\\]/i, \' \'],',
  '  [/^This is an automatically generated checkpoint[\\s\\S]*$/im, \' \'],',
  '  [/^The approval policy changed[\\s\\S]*$/im, \' \'],',
].join('\n') + '\n'

// Client
patch('src/client/preview-text.ts', {
  markerAnchor: '  /^elapsed since the preceding/i,',
  patternsAnchor: "  [/^\\s*The available skill catalog changed[\\s\\S]*$/im, ' '],",
  markerLines: markerLinesTs,
  patternLines: patternLinesTs,
})
// src host (same shape, different anchor text)
patch('src/host/routes.ts', {
  markerAnchor: '  /^elapsed since the preceding/i,',
  patternsAnchor: "  out = out.replace(/^\\s*The available skill catalog changed[\\s\\S]*$/im, ' ')",
  markerLines: markerLinesTs,
  patternLines: [
    "  out = out.replace(/^\\[[a-z][^\\]]{0,90}\\]/i, ' ')",
    "  out = out.replace(/^This is an automatically generated checkpoint[\\s\\S]*$/im, ' ')",
    "  out = out.replace(/^The approval policy changed[\\s\\S]*$/im, ' ')",
  ].join('\n') + '\n',
})
// Built host bundle
patch('lib/index.js', {
  markerAnchor: '\t/^elapsed since the preceding/i,',
  patternsAnchor: '\tout = out.replace(/^\\s*The available skill catalog changed[\\s\\S]*$/im, " ");',
  markerLines: [
    '\t/^\\[[a-z][^\\]]{0,90}\\]/i,',
    '\t/^this is an automatically generated checkpoint/i,',
    '\t/^the approval policy changed/i,',
    '\t/^\\(empty message\\)/i,',
  ].join('\n') + '\n',
  patternLines: [
    '\tout = out.replace(/^\\[[a-z][^\\]]{0,90}\\]/i, " ");',
    '\tout = out.replace(/^This is an automatically generated checkpoint[\\s\\S]*$/im, " ");',
    '\tout = out.replace(/^The approval policy changed[\\s\\S]*$/im, " ");',
  ].join('\n') + '\n',
})
