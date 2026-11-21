/**
 * Issue #2 (one click placed 966 cards) and part of #6 (1000+ sessions overwhelm the map):
 *   - cap what an explicit workspace import / folder sync may place at once,
 *     and tell the user how many were skipped;
 *   - cap the card-preview batch per tick instead of asking the Host for 1000 surfaces.
 */
import fs from 'node:fs'

const edits = []
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// ── 1. the cap constant ────────────────────────────────────────────────────
if (!text.includes('const IMPORT_CAP')) {
  const anchor = '/** Sessions eligible for a card: top-level, non-empty logs. */'
  if (!text.includes(anchor)) throw new Error('placeableSessionIds anchor missing')
  text = text.replace(
    anchor,
    `/**
 * How many cards one click may place at once. A workspace with ~1000 sessions used to dump
 * all of them onto the canvas (issue #2); the newest ones are the useful ones, and the rest
 * can be pulled in with the next import.
 */
const IMPORT_CAP = 120
/** Card previews asked for per poll tick (one Host read per session). */
const PREVIEW_BATCH = 40

` + anchor,
  )
  edits.push('IMPORT_CAP / PREVIEW_BATCH constants')
}

// ── 2. importWorkspace: cap + report ──────────────────────────────────────
{
  const before = `      const memberSessions = placeableSessionIds(sessions, archivedSessionIds)
        .filter(id => sessionWs.get(id) === workspaceId && !boardSessionIds.has(id))
        .sort((a, b) => (sessions.byId[b]?.updatedAt ?? 0) - (sessions.byId[a]?.updatedAt ?? 0))
      const memory = canvasState.global?.layoutMemory ?? {}
      const remembered = memberSessions.filter(id => memory[id] !== undefined)
      const fresh = memberSessions.filter(id => memory[id] === undefined)`
  const after = `      const allMembers = placeableSessionIds(sessions, archivedSessionIds)
        .filter(id => sessionWs.get(id) === workspaceId && !boardSessionIds.has(id))
        .sort((a, b) => (sessions.byId[b]?.updatedAt ?? 0) - (sessions.byId[a]?.updatedAt ?? 0))
      // Newest first, and never more than IMPORT_CAP in one go (issue #2).
      const memberSessions = allMembers.slice(0, IMPORT_CAP)
      const skipped = allMembers.length - memberSessions.length
      const memory = canvasState.global?.layoutMemory ?? {}
      const remembered = memberSessions.filter(id => memory[id] !== undefined)
      const fresh = memberSessions.filter(id => memory[id] === undefined)`
  if (!text.includes(before)) throw new Error('importWorkspace body anchor missing')
  text = text.replace(before, after)

  const tailBefore = `    canvas.setWsFrameRect(workspaceId, rect)
  }`
  const tailAfter = `    canvas.setWsFrameRect(workspaceId, rect)
    if (skipped > 0) {
      showToast(t('toast.importCapped', { n: String(placed.length), more: String(skipped) }))
    }
  }`
  if (!text.includes(tailBefore)) throw new Error('importWorkspace tail anchor missing')
  text = text.replace(tailBefore, tailAfter)
  edits.push('importWorkspace capped')
}

// ── 3. syncGroup: same cap ────────────────────────────────────────────────
{
  const before = `    const fresh = placeableSessionIds(sessions, archivedSessionIds)
      .filter(id => sessionWs.get(id) === groupId && !boardSessionIds.has(id))
      .sort((a, b) => (sessions.byId[b]?.updatedAt ?? 0) - (sessions.byId[a]?.updatedAt ?? 0))
    if (fresh.length === 0) return`
  const after = `    const fresh = placeableSessionIds(sessions, archivedSessionIds)
      .filter(id => sessionWs.get(id) === groupId && !boardSessionIds.has(id))
      .sort((a, b) => (sessions.byId[b]?.updatedAt ?? 0) - (sessions.byId[a]?.updatedAt ?? 0))
      .slice(0, IMPORT_CAP)
    if (fresh.length === 0) return`
  if (!text.includes(before)) throw new Error('syncGroup anchor missing')
  text = text.replace(before, after)
  edits.push('syncGroup capped')
}

// ── 4. previews: batch limit per tick ─────────────────────────────────────
{
  const before = `      if (pending.length === 0) return
      for (const [sessionId, stamp] of stamps) previewStamp.current.set(sessionId, stamp)
      void talkMapApi.lastUserMessages(pending)`
  const after = `      if (pending.length === 0) return
      // Ask for the newest PREVIEW_BATCH only: the rest arrive on later ticks, and a board
      // with a thousand cards must not fire a thousand session reads at once (issue #6).
      const batchStamps = stamps.slice(0, PREVIEW_BATCH)
      const batch = pending.slice(0, PREVIEW_BATCH)
      for (const [sessionId, stamp] of batchStamps) previewStamp.current.set(sessionId, stamp)
      void talkMapApi.lastUserMessages(batch)`
  if (!text.includes(before)) throw new Error('preview tick anchor missing')
  text = text.replace(before, after)
  edits.push('preview batch capped')
}

fs.writeFileSync(file, text, 'utf8')

// ── 5. strings ────────────────────────────────────────────────────────────
{
  const i18n = 'src/client/i18n.ts'
  let s = fs.readFileSync(i18n, 'utf8')
  if (!s.includes("'toast.importCapped'")) {
    const zh = "  'toast.workspaceTrashed':"
    const en = "  'toast.workspaceTrashed':"
    const zhLine = s.split('\n').find(l => l.includes(zh))
    if (zhLine === undefined) throw new Error('i18n zh anchor missing')
    // 中英两条都跟在 workspaceTrashed 之后
    const zhInsert = "  'toast.importCapped': '已放入 {n} 张卡片，另有 {more} 个会话未放入（下次导入或同步会继续）',"
    const enInsert = "  'toast.importCapped': 'placed {n} cards; {more} sessions left for a later import or sync',"
    const [zhHalf, enHalf] = s.split(/\n(?=\s*'card\.draft')/u)
    s = s.replace(/^(\s*'toast\.workspaceTrashed':[^\n]*\n)/m, `$1${zhInsert}\n`)
    s = s.replace(/(\n\s*'toast\.workspaceTrashed':[^\n]*\n)([\s\S]*)$/m, `$1${enInsert}\n$2`)
    fs.writeFileSync(i18n, s, 'utf8')
    edits.push('i18n toast.importCapped')
  }
}

console.log(edits.join('\n'))
