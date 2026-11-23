/**
 * Client side of the preview fix: send the stamp so the Host can answer from cache, ask for
 * fewer sessions per tick, skip polling while the window is hidden, and make the draft scan
 * reject empty drafts without parsing them.
 */
import fs from 'node:fs'

const edits = []
const read = file => fs.readFileSync(file, 'utf8')
const write = (file, text) => fs.writeFileSync(file, text, 'utf8')

// ── api.ts: accept { id, stamp } ──────────────────────────────────────────
{
  const file = 'src/client/api.ts'
  let text = read(file)
  const before = `  lastUserMessages(sessionIds: readonly string[]): Promise<{ texts: Record<string, string> }> {
    return postJson('/talk-map/last-user', { sessionIds })
  },`
  const after = `  lastUserMessages(
    // A stamp (the session's own \`updatedAt\`) lets the Host skip a re-read when nothing moved.
    ids: readonly (string | { id: string; stamp?: number })[],
  ): Promise<{ texts: Record<string, string> }> {
    return postJson('/talk-map/last-user', { sessionIds: ids })
  },`
  if (!text.includes(before)) throw new Error('api.lastUserMessages anchor missing')
  text = text.replace(before, after)
  write(file, text)
  edits.push('api')
}

// ── MapCanvas: smaller batch, stamps, hidden-window guard ─────────────────
{
  const file = 'src/client/MapCanvas.tsx'
  let text = read(file)
  text = text.replace(
    '/** Card previews requested per poll tick (one Host read per session). */\nconst PREVIEW_BATCH = 40',
    '/** Card previews requested per poll tick (each one is a session-surface read on the Host). */\nconst PREVIEW_BATCH = 8',
  )
  if (!text.includes('const PREVIEW_BATCH = 8')) throw new Error('PREVIEW_BATCH not updated')

  const before = `      void talkMapApi.lastUserMessages(batch)`
  const after = `      void talkMapApi.lastUserMessages(batchStamps.map(([id, stamp]) => ({ id, stamp })))`
  if (!text.includes(before)) throw new Error('lastUserMessages call anchor missing')
  text = text.replace(before, after)

  // skip the poll while nobody is looking
  const tickStart = `      const { cards, sessions: latest } = previewInputs.current`
  if (!text.includes(tickStart)) throw new Error('tick start anchor missing')
  text = text.replace(
    tickStart,
    `      // Nothing is visible: do not spend Host reads on a hidden window.
      if (typeof document !== 'undefined' && document.hidden) return
${tickStart}`,
  )
  write(file, text)
  edits.push('MapCanvas')
}

// ── SidebarQueue: stamps + hidden-window guard ───────────────────────────
{
  const file = 'src/client/SidebarQueue.tsx'
  let text = read(file)
  const before = `    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .map(row => row.sessionId)
      .filter(id => !askedRef.current.has(id))
    if (wanted.length === 0) return
    for (const id of wanted) askedRef.current.add(id)
    void talkMapApi.lastUserMessages(wanted)`
  const after = `    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .filter(row => !askedRef.current.has(row.sessionId))
      .map(row => ({ id: row.sessionId, stamp: row.updatedAt ?? 0 }))
    if (wanted.length === 0) return
    for (const item of wanted) askedRef.current.add(item.id)
    void talkMapApi.lastUserMessages(wanted)`
  if (!text.includes(before)) throw new Error('sidebar preview call anchor missing')
  text = text.replace(before, after)

  const timer = `    const timer = setInterval(() => { setDrafts(readDraftTexts()) }, 1500)`
  if (!text.includes(timer)) throw new Error('sidebar timer anchor missing')
  text = text.replace(
    timer,
    `    const timer = setInterval(() => {
      // A hidden window does not need the scan; the store is tiny but so is the fix.
      if (typeof document !== 'undefined' && document.hidden) return
      setDrafts(readDraftTexts())
    }, 1500)`,
  )
  write(file, text)
  edits.push('SidebarQueue')
}

// ── draft-watch: reject empty drafts before JSON.parse ───────────────────
{
  const file = 'src/client/draft-watch.ts'
  let text = read(file)
  const helper = `const STORE_PREFIX = 'dsh.conversation.'`
  if (!text.includes('draftMayBeEmpty')) {
    text = text.replace(
      helper,
      `const STORE_PREFIX = 'dsh.conversation.'

/**
 * \`{"draft":""}\` / \`{"draft":{}}\` is the overwhelmingly common case (one entry per session,
 * thousands of sessions), and JSON.parse for those dominates the scan. Reject on the raw
 * string first; anything else goes through the parser as before.
 */
function draftMayBeEmpty(raw: string): boolean {
  return raw.includes('"draft":""') || raw.includes('"draft":{}') || !raw.includes('"draft"')
}`,
    )
  }
  // readDraftTexts loop
  const scanBefore = `    const text = readDraftText(sessionId)`
  if (text.includes(scanBefore)) {
    text = text.replace(
      scanBefore,
      `    const raw = localStorage.getItem(key)
    if (raw === null || draftMayBeEmpty(raw)) continue
    const text = readDraftText(sessionId)`,
    )
  }
  // readDraftSessions loop
  const loopBefore = `      const raw = localStorage.getItem(key)
      if (raw === null) continue
      const stored: unknown = JSON.parse(raw)`
  if (text.includes(loopBefore)) {
    text = text.replace(
      loopBefore,
      `      const raw = localStorage.getItem(key)
      if (raw === null || draftMayBeEmpty(raw)) continue
      const stored: unknown = JSON.parse(raw)`,
    )
  }
  write(file, text)
  edits.push('draft-watch')
}

console.log(edits.join(', '))
