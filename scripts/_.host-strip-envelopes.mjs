/**
 * One-off: hand-patch the built Host bundle (lib/index.js) — this package ships
 * no tsdown config, so the host half cannot be rebuilt here. Mirrored in
 * src/host/routes.ts, which stays the source of truth.
 *
 * Adds `stripEnvelopes` and applies it to the last-user preview text. Idempotent.
 */
import fs from 'node:fs'

const file = new URL('../lib/index.js', import.meta.url)
let text = fs.readFileSync(file, 'utf8')

if (text.includes('function stripEnvelopes')) {
  console.log('already applied')
  process.exit(0)
}

const T = '\t'

// 1. The cleaner, next to textOfBlocks.
const helperAnchor = 'function extractFromSurface(events, capturedThroughSeq) {'
if (!text.includes(helperAnchor)) {
  console.error('helper anchor not found')
  process.exit(1)
}
const helper = [
  '/** What the human actually typed: drop the per-turn envelopes the runtime',
  ' * appends (sampling remark, <system-reminder>, runtime-memory snapshot,',
  ' * "Current runtime context"). An envelope-only message becomes empty, and the',
  ' * caller walks back to the previous one. */',
  'function stripEnvelopes(text) {',
  '  let out = text;',
  '  out = out.replace(/<system-reminder>[\\s\\S]*?<\\/system-reminder>/gi, " ");',
  '  out = out.replace(/<available_skills>[\\s\\S]*?<\\/available_skills>/gi, " ");',
  '  out = out.replace(/<runtime-memory-file[^>]*>[\\s\\S]*?<\\/runtime-memory-file>/gi, " ");',
  '  out = out.replace(/^\\[?Time sampled while preparing[^\\n]*$/gim, " ");',
  '  out = out.replace(/^\\s*MNEMON RUNTIME MEMORY SNAPSHOT[\\s\\S]*$/i, " ");',
  '  out = out.replace(/^\\s*MNEMON VIEW TOOLS[\\s\\S]*$/im, " ");',
  '  out = out.replace(/^\\s*Current runtime context\\.[\\s\\S]*$/im, " ");',
  '  return out.replace(/[ \\t]+\\n/g, "\\n").replace(/\\n{3,}/g, "\\n\\n").trim();',
  '}',
  '',
].join('\n')
text = text.replace(helperAnchor, helper + helperAnchor)

// 2. Use it in the last-user route.
const joinedLine = `${T.repeat(9)}const joined = message.content.filter((block) => typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\\n").trim();`
const joinedNext = `${T.repeat(9)}if (joined !== "") text = joined;`
if (!text.includes(joinedLine) || !text.includes(joinedNext)) {
  console.error('route body anchor not found')
  process.exit(1)
}
text = text.replace(joinedLine, `${T.repeat(9)}const joined = stripEnvelopes(message.content.filter((block) => typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\\n").trim());`)
text = text.replace(joinedNext, `${T.repeat(9)}// Envelope-only turns are skipped: the card keeps the last human text.\n${T.repeat(9)}if (joined !== "") text = joined;`)

fs.writeFileSync(file, text, 'utf8')
console.log('host bundle: stripEnvelopes applied')
