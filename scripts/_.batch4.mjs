/** Direction arrow on injection edges + a stricter snippet cleaner. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- MapCanvas: arrowheads on injection edges -------------------------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
canvas = canvas.replace(
  '  Background, BackgroundVariant, ConnectionMode, ControlButton, Controls,',
  '  Background, BackgroundVariant, ConnectionMode, ControlButton, Controls, MarkerType,',
)
const anchor = `        // Pure association lines: no label, lighter than injection edges.
        ...(kind === 'link'
          ? { style: { opacity: 0.4 } }
          : {`
if (!canvas.includes(anchor)) {
  console.error('edge anchor missing')
  process.exit(1)
}
canvas = canvas.replace(
  anchor,
  `        // Pure association lines: no label, lighter than injection edges.
        ...(kind === 'link'
          ? { style: { opacity: 0.4 } }
          : {
              // An arrowhead says which conversation feeds which: the line runs
              // from the source (parent) into the card that receives the context.
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 16,
                height: 16,
                color: 'rgba(255, 214, 106, 0.85)',
              },`,
)
fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')

// ---- snippet cleaning: throw away JSON payloads, keep prose ------------
let snippet = fs.readFileSync('src/client/snippet-text.ts', 'utf8')
const oldClean = `export function cleanSnippet(raw: string, query: string): string {
  let text = unescape(String(raw ?? ''))`
const newClean = `/** True when the text is carrying serialized JSON rather than prose. */
function looksSerialized(value: string): boolean {
  return /\\{\\s*"|"\\s*:\\s*("|\\[|\\{|\\d|true|false|null)/.test(value) || (value.match(/\\\\?"/g) ?? []).length >= 4
}

/** Pull out the human strings from a serialized payload, dropping the keys. */
function keepProse(value: string): string {
  const quoted = [...value.matchAll(/"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"/g)].map(match => match[1])
  const prose = quoted
    .map(part => part.replace(/\\\\n|\\\\r/g, ' ').trim())
    .filter(part => part.length >= 6 && /[\\u4e00-\\u9fff]|[A-Za-z]/.test(part))
    // Keep the longest few: keys are short, values are the readable ones.
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
  return prose.length > 0 ? prose.join(' … ') : ''
}

export function cleanSnippet(raw: string, query: string): string {
  let text = unescape(String(raw ?? ''))
  if (looksSerialized(text)) {
    const prose = keepProse(text)
    if (prose !== '') text = prose
  }`
if (!snippet.includes(oldClean)) {
  console.error('cleanSnippet anchor missing')
  process.exit(1)
}
snippet = snippet.replace(oldClean, newClean)
fs.writeFileSync('src/client/snippet-text.ts', snippet, 'utf8')

console.log('arrowheads + stricter cleaning')
