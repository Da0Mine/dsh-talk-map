/**
 * One-off: hand-patch the built Host bundle (lib/index.js). This package ships no
 * tsdown config, so the host half cannot be rebuilt here; src/host/routes.ts stays
 * the source of truth and carries the same logic.
 *
 * Now: envelope-only user messages (their own `Time sampled…` / `Current runtime
 * context.…` turns, verified against real session logs) are skipped outright, and
 * the extra metadata lines are stripped. Idempotent.
 */
import fs from 'node:fs'

const file = new URL('../lib/index.js', import.meta.url)
let text = fs.readFileSync(file, 'utf8')

if (text.includes('function isEnvelopeOnly')) {
  console.log('already applied')
  process.exit(0)
}

const start = text.indexOf('function stripEnvelopes(text) {')
if (start < 0) {
  console.error('stripEnvelopes not found')
  process.exit(1)
}
const end = text.indexOf('\n}\n', start)
if (end < 0) {
  console.error('stripEnvelopes end not found')
  process.exit(1)
}

const replacement = `function isEnvelopeOnly(text) {
	const firstLine = text.split("\\n").map((line) => line.trim()).find((line) => line !== "") ?? "";
	return [/^\\[?time sampled while preparing/i, /^current runtime context\\./i, /^<system-reminder>/i, /^<available_skills>/i, /^<runtime-memory-file/i, /^mnemon runtime memory snapshot/i, /^browser time zone for this request/i, /^elapsed since the preceding/i].some((marker) => marker.test(firstLine));
}
function stripEnvelopes(text) {
	let out = text;
	out = out.replace(/<system-reminder>[\\s\\S]*?<\\/system-reminder>/gi, " ");
	out = out.replace(/<available_skills>[\\s\\S]*?<\\/available_skills>/gi, " ");
	out = out.replace(/<runtime-memory-file[^>]*>[\\s\\S]*?<\\/runtime-memory-file>/gi, " ");
	out = out.replace(/^\\[?Time sampled while preparing[^\\n]*$/gim, " ");
	out = out.replace(/^Elapsed since the preceding[^\\n]*$/gim, " ");
	out = out.replace(/^Browser time zone for this request[^\\n]*$/gim, " ");
	out = out.replace(/^\\s*MNEMON RUNTIME MEMORY SNAPSHOT[\\s\\S]*$/im, " ");
	out = out.replace(/^\\s*MNEMON VIEW TOOLS[\\s\\S]*$/im, " ");
	out = out.replace(/^\\s*Current runtime context\\.[\\s\\S]*$/im, " ");
	out = out.replace(/^\\s*Current working directory:[^\\n]*$/gim, " ");
	out = out.replace(/^\\s*Current DSH file policy:[^\\n]*$/gim, " ");
	out = out.replace(/^\\s*Approval prompts are disabled[^\\n]*$/gim, " ");
	out = out.replace(/^\\s*Current DeepSeek Harness[^\\n]*$/gim, " ");
	out = out.replace(/^\\s*The available skill catalog changed[\\s\\S]*$/im, " ");
	return out.replace(/[ \\t]+\\n/g, "\\n").replace(/\\n{3,}/g, "\\n\\n").trim();
}`

text = text.slice(0, start) + replacement + text.slice(end + 2)

const joinedLine = '\t\t\t\t\t\tconst joined = stripEnvelopes(message.content.filter((block) => typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\\n").trim());'
if (!text.includes(joinedLine)) {
  console.error('joined line not found')
  process.exit(1)
}
const guarded = [
  '\t\t\t\t\t\tconst raw = message.content.filter((block) => typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\\n").trim();',
  '\t\t\t\t\t\tif (isEnvelopeOnly(raw)) continue;',
  '\t\t\t\t\t\tconst joined = stripEnvelopes(raw);',
].join('\n')
text = text.replace(joinedLine, guarded)

fs.writeFileSync(file, text, 'utf8')
console.log('host bundle: envelope gating applied')
