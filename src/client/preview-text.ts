/**
 * Strip the per-turn envelopes the runtime appends to a "user message".
 *
 * The model-visible user message is not only what the human typed: it also
 * carries a sampling remark, `<system-reminder>` blocks (skill catalog changes),
 * the runtime-memory snapshot and the "Current runtime context" footer. The Host
 * route already cleans the preview, but this runs in the client too, so a card
 * never shows that noise even when the Host half has not been restarted yet.
 */
const PATTERNS: readonly [RegExp, string][] = [
  [/<system-reminder>[\s\S]*?<\/system-reminder>/gi, ' '],
  [/<available_skills>[\s\S]*?<\/available_skills>/gi, ' '],
  [/<runtime-memory-file[^>]*>[\s\S]*?<\/runtime-memory-file>/gi, ' '],
  [/^\[?Time sampled while preparing[^\n]*$/gim, ' '],
  [/^\s*MNEMON RUNTIME MEMORY SNAPSHOT[\s\S]*$/im, ' '],
  [/^\s*MNEMON VIEW TOOLS[\s\S]*$/im, ' '],
  [/^\s*Current runtime context\.[\s\S]*$/im, ' '],
  [/^\s*Current working directory:[^\n]*$/gim, ' '],
  [/^\s*Current DSH file policy:[^\n]*$/gim, ' '],
  [/^\s*Approval prompts are disabled[^\n]*$/gim, ' '],
  [/^\s*Current DeepSeek Harness implementation checkout:[^\n]*$/gim, ' '],
  [/^\s*Current DeepSeek Harness Web GUI URL:[^\n]*$/gim, ' '],
  [/^\s*Browser time zone for this request:[^\n]*$/gim, ' '],
  [/^\s*The available skill catalog changed[\s\S]*$/im, ' '],
]

export function cleanPreviewText(text: string | undefined): string {
  if (text === undefined) return ''
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
