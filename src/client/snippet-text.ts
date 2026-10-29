/**
 * Snippet clean-up.
 *
 * A snippet is cut out of a stored event, and events carry JSON-ish scaffolding
 * (`"key":`, escaped quotes, injected markers like `[tool/result; checkpoint
 * event 12901]`). None of that belongs on screen, so it is stripped before the
 * inline-Markdown pass — and if a line is still mostly punctuation it falls back
 * to a window around the match.
 */

const NOISE_MARKER = /\[(?:tool\/result|assistant\/message|user\/message|system\/message|developer\/message|dsh-[a-z-]+)[^\]]*\]/gi
const JSON_KEY = /"[A-Za-z0-9_$]+"\s*:\s*/g

function unescape(value: string): string {
  return value
    .replace(/\\r\\n|\\n|\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** Fraction of characters that are JSON punctuation rather than prose. */
function punctuationRatio(value: string): number {
  if (value === '') return 0
  const noisy = value.replace(/[^\s"{}[\],:]/g, '').length
  return noisy / value.length
}

export function cleanSnippet(raw: string, query: string): string {
  let text = unescape(String(raw ?? ''))
  text = text.replace(NOISE_MARKER, ' ')
  text = text.replace(JSON_KEY, ' ')
  text = text.replace(/[{}\[\]]/g, ' ')
  text = text.replace(/"{2,}/g, ' ')
  text = text.replace(/^[\s"',;:]+|[\s"',;:]+$/g, '')
  text = text.replace(/\s{2,}/g, ' ').trim()

  // Still mostly scaffolding? Keep just the window around the match.
  if (punctuationRatio(text) > 0.28) {
    const needle = query.trim().toLowerCase()
    const at = needle === '' ? 0 : text.toLowerCase().indexOf(needle)
    const start = Math.max(0, at - 60)
    const end = Math.min(text.length, at + 90)
    const window = text.slice(start, end)
      .replace(/[{}[\]]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    text = (start > 0 ? '…' : '') + window + (end < text.length ? '…' : '')
  }

  return text === '' ? String(raw ?? '').trim() : text
}
