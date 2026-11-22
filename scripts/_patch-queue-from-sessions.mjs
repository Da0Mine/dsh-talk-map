/**
 * Sidebar queue: list SESSIONS, not cards.
 *
 * The bug: a brand-new conversation stayed invisible in the native sidebar until the map
 * panel was opened, because rows were built from `canvas.cards` and cards for new sessions
 * are only created by an effect inside MapCanvas (which runs when the panel mounts).
 *
 * Cards are a map-layout concern, not a "does this need the user's attention" concern, so the
 * queue now derives its rows from the session list (plus the workspace snapshot for the
 * archived set, which `sessions.list` still contains).
 */
import fs from 'node:fs'

const file = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const edits = []

// 1) workspace snapshot subscription (runtime store behind ctx.workspaces)
if (!lines.some(l => l.includes('workspaceStore'))) {
  const at = lines.findIndex(l => l.includes('const alerts = useSyncExternalStore(sessionAlerts.subscribe'))
  if (at < 0) throw new Error('alerts subscription not found')
  const indent = lines[at].match(/^\s*/)[0]
  lines.splice(at, 0,
    ...[
      '// ctx.workspaces is a ClientWorkspaceModel at runtime (subscribe + getSnapshot); our',
      '// type only declares the two methods we call elsewhere, so probe it defensively.',
      'const workspaceStore = services?.workspaces as unknown as {',
      '  getSnapshot?: () => { archivedSessionIds?: readonly string[] }',
      '  subscribe?: (listener: () => void) => () => void',
      '} | undefined',
      'const emptyWorkspaces = (): { archivedSessionIds?: readonly string[] } => ({})',
      'const workspaceState = useSyncExternalStore(',
      '  workspaceStore?.subscribe === undefined ? NO_SUBSCRIBE : (listener) => workspaceStore.subscribe!(listener),',
      '  workspaceStore?.getSnapshot === undefined ? emptyWorkspaces : () => workspaceStore.getSnapshot!(),',
      ')',
      'const archivedSessionIds = useMemo(',
      '  () => new Set(workspaceState.archivedSessionIds ?? []),',
      '  [workspaceState],',
      ')',
    ].map(line => indent + line),
  )
  edits.push('workspace snapshot + archived set')
}

// 2) rows from sessions instead of cards
const rowsStart = lines.findIndex(l => l.includes('// Only lamped cards, exactly like the rail.'))
if (rowsStart < 0) throw new Error('rows memo not found')
let rowsEnd = rowsStart
while (rowsEnd < lines.length && !lines[rowsEnd].includes('}, [canvasState.cards, sessions, statusById')) rowsEnd += 1
if (rowsEnd >= lines.length) throw new Error('rows memo end not found')
const indent = lines[rowsStart].match(/^\s*/)[0]

const block = [
  '// Lamped sessions, exactly like the rail — but keyed off the session list, so a',
  '// conversation that just started shows up without the map panel ever being opened.',
  'const rows = useMemo(() => {',
  '  // Existing card per session, kept only so the map can focus the right card.',
  '  const cardBySession = new Map<string, string>()',
  '  for (const [cardId, card] of Object.entries(canvasState.cards)) {',
  '    if (card.boardId === INBOX_BOARD_ID) cardBySession.set(card.sessionId, cardId)',
  '  }',
  '  const out: { cardId: string; sessionId: string; title: string; lamp?: CardGlow; draft?: boolean; draftText?: string; updatedAt?: number }[] = []',
  '  for (const sessionId of sessions.ids) {',
  '    const summary = sessions.byId[sessionId]',
  '    if (summary === undefined) continue',
  '    // Same eligibility rules the map uses for placing a card.',
  '    if (summary.blank === true) continue',
  "    if (summary.origin === 'subagent') continue",
  '    if (archivedSessionIds.has(sessionId)) continue',
  '    const lamp = lampOf(sessionId, statusById.get(sessionId), summary, alerts, finished)',
  '    // Draft-only rows join at the lowest priority (after every lamped row).',
  '    const draftText = drafts[sessionId]',
  "    const hasDraft = draftText !== undefined && draftText.trim() !== ''",
  '    if (lamp === undefined && !hasDraft) continue',
  "    if (lamp === 'done' && opened.has(sessionId)) continue",
  '    const draftOnly = lamp === undefined',
  '    out.push({',
  '      cardId: cardBySession.get(sessionId) ?? sessionId,',
  '      sessionId,',
  '      title: summary.displayTitle ?? sessionId,',
  '      ...(draftOnly ? { draft: true } : { lamp }),',
  '      ...(draftText !== undefined ? { draftText } : {}),',
  '      ...(summary.updatedAt !== undefined ? { updatedAt: summary.updatedAt } : {}),',
  '    })',
  '  }',
  '  // Same rule as the map rail: priority bucket first, then newest inside it.',
  '  return sortQueueRows(out)',
  '}, [canvasState.cards, sessions, statusById, alerts, finished, drafts, opened, archivedSessionIds])',
].map(line => indent + line)

lines.splice(rowsStart, rowsEnd - rowsStart + 1, ...block)
edits.push('rows from sessions')

fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('patched:', edits.join(', '))
