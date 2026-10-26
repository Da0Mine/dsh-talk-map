/**
 * Strip the per-turn envelopes the runtime appends to a "user message".
 *
 * Real session logs show two shapes (verified 2026-10-26 against the stored
 * `session.v4.jsonl.zstd` files under `~/.dsh/sessions/`):
 *   1. the envelope is its OWN user message — `Time sampled while preparing…`
 *      (plus `Browser time zone…`, `Elapsed since…`) or `Current runtime context.…`
 *      — appended after the human's message;
 *   2. the envelope is appended to the human's message.
 *
 * So: a message that STARTS with an envelope marker carries no human text and is
 * dropped outright by `isEnvelopeOnly`; anything else keeps its body and only the
 * trailing envelope blocks are removed. This also runs client-side, so a card
 * stays clean even when the Host half has not been restarted.
 */
const LEADING_MARKERS: readonly RegExp[] = [
  /^\[?time sampled while preparing/i,
  /^current runtime context\./i,
  /^<system-reminder>/i,
  /^<available_skills>/i,
  /^<runtime-memory-file/i,
  /^mnemon runtime memory snapshot/i,
  /^browser time zone for this request/i,
  // Shapes found by scanning every stored session (2026-10-26):
  /^\[[a-z][^\]]{0,200}\]/i,          // [MNEMON] …, [model changed: …], [dsh-mnemon: …]
  /^this is an automatically generated checkpoint/i,
  /^the approval policy changed/i,
  /^\(empty message\)/i,
  /^elapsed since the preceding/i,
  // Subagent checkpoints are machine-authored prompts, not something a person typed.
  /^\[dsh-mnemon:/i,
]

const PATTERNS: readonly [RegExp, string][] = [
  [/<system-reminder>[\s\S]*?<\/system-reminder>/gi, ' '],
  [/<available_skills>[\s\S]*?<\/available_skills>/gi, ' '],
  [/<runtime-memory-file[^>]*>[\s\S]*?<\/runtime-memory-file>/gi, ' '],
  [/^\[?Time sampled while preparing[^\n]*$/gim, ' '],
  [/^Elapsed since the preceding[^\n]*$/gim, ' '],
  [/^Browser time zone for this request[^\n]*$/gim, ' '],
  [/^\s*MNEMON RUNTIME MEMORY SNAPSHOT[\s\S]*$/im, ' '],
  [/^\s*MNEMON VIEW TOOLS[\s\S]*$/im, ' '],
  [/^\s*Current runtime context\.[\s\S]*$/im, ' '],
  [/^\s*Current working directory:[^\n]*$/gim, ' '],
  [/^\s*Current DSH file policy:[^\n]*$/gim, ' '],
  [/^\s*Approval prompts are disabled[^\n]*$/gim, ' '],
  [/^\s*Current DeepSeek Harness implementation checkout:[^\n]*$/gim, ' '],
  [/^\s*Current DeepSeek Harness Web GUI URL:[^\n]*$/gim, ' '],
  [/^\[[a-z][^\]]{0,200}\]/i, ' '],
  [/^This is an automatically generated checkpoint[\s\S]*$/im, ' '],
  [/^The approval policy changed[\s\S]*$/im, ' '],
  [/^\[model changed:[\s\S]*$/im, ' '],
  [/^\s*The available skill catalog changed[\s\S]*$/im, ' '],
]

/** True when the message is nothing but runtime envelope. */
export function isEnvelopeOnly(text: string): boolean {
  const firstLine = text.split('\n').map(line => line.trim()).find(line => line !== '') ?? ''
  return LEADING_MARKERS.some(marker => marker.test(firstLine))
}

export function cleanPreviewText(text: string | undefined): string {
  if (text === undefined) return ''
  if (isEnvelopeOnly(text)) return ''
  let out = text
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement)
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // A tag that survived on its own (unpaired) is still noise.
    .replace(/<\/?[a-z][\w-]*(?:\s[^>]*)?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
