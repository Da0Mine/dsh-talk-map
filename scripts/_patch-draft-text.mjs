import fs from 'node:fs'
const file = 'src/client/draft-watch.ts'
let text = fs.readFileSync(file, 'utf8')

// 1) 读草稿文本（不只判断有没有）
const anchor = "/** Which sessions currently hold unsent text, straight from the shell's store. */"
const addition = `/** The unsent text of one session, or '' when it has none. */
export function readDraftText(sessionId: string): string {
  if (typeof localStorage === 'undefined') return ''
  try {
    const raw = localStorage.getItem(STORE_PREFIX + sessionId)
    if (raw === null) return ''
    const stored: unknown = JSON.parse(raw)
    const draft = stored !== null && typeof stored === 'object'
      ? (stored as { draft?: unknown }).draft
      : undefined
    return draftTextOf(draft)
  } catch {
    return ''
  }
}

/** Every session's unsent text, for cards that show the pending message. */
export function readDraftTexts(): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof localStorage === 'undefined') return out
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key === null || !key.startsWith(STORE_PREFIX)) continue
    const sessionId = key.slice(STORE_PREFIX.length)
    if (sessionId === '') continue
    const text = readDraftText(sessionId)
    if (text.trim() !== '') out[sessionId] = text
  }
  return out
}

` + anchor
if (!text.includes(anchor)) throw new Error('draft anchor missing')
text = text.replace(anchor, addition)
fs.writeFileSync(file, text, 'utf8')
console.log('draft-watch: readDraftText/readDraftTexts added')
