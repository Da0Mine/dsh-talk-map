/**
 * Fourth inheritance mode: inject the conversation's CURRENT context (what the model is
 * actually given now), skipping everything compaction already dropped.
 *
 *   • host: POST /talk-map/context-window — reads the session surface, subtracts the seqs
 *     named by every `compaction/prune` record, renders the rest as text.
 *   • client: a 'context' mode in the fork panel that fetches that text and injects it.
 */
import fs from 'node:fs'

const edits = []

// ── A. edge kind union ──────────────────────────────────────────────────────
{
  const file = 'src/shared/model.ts'
  let text = fs.readFileSync(file, 'utf8')
  const before = "  kind: 'digest' | 'full' | 'selection' | 'none' | 'link'"
  const after = "  kind: 'digest' | 'context' | 'full' | 'selection' | 'none' | 'link'"
  if (!text.includes(before)) throw new Error('model.ts kind union not found')
  fs.writeFileSync(file, text.replace(before, after), 'utf8')
  edits.push('model.ts kind += context')
}

// ── B. host route ───────────────────────────────────────────────────────────
{
  const file = 'src/host/routes.ts'
  let text = fs.readFileSync(file, 'utf8')
  const anchor = "        if (route === 'POST /talk-map/digest/refresh') {"
  if (!text.includes(anchor)) throw new Error('routes.ts anchor missing')
  const block = `        if (route === 'POST /talk-map/context-window') {
          // "What the model is being given right now": every record the log still carries,
          // minus the ones compaction pruned (compaction/prune names them by seq). That is
          // the live window — older, already-compressed history is deliberately absent.
          const body = (await readJsonBody(request)) as { sessionId?: unknown; maxChars?: unknown }
          const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
          if (sessionId === '') {
            sendJson(response, 400, { error: 'sessionId is required' })
            return
          }
          const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 60000
          const maxChars = Math.min(Math.max(requested, 4000), 400000)
          const query = runtime.sessionQuery
          if (query === undefined) {
            sendJson(response, 503, { error: 'session surface unavailable' })
            return
          }
          const surface = await query.readSurface(sessionId)
          // 1) seqs compaction threw away
          const pruned = new Set<number>()
          for (const raw of surface.events) {
            const event = raw as { type?: string; data?: { shadowedSeqs?: unknown } }
            if (event.type !== 'compaction/prune') continue
            const seqs = event.data?.shadowedSeqs
            if (!Array.isArray(seqs)) continue
            for (const seq of seqs) if (typeof seq === 'number') pruned.add(seq)
          }
          // 2) everything else, in order
          const lines: string[] = []
          for (const raw of surface.events) {
            const event = raw as {
              type?: string
              seq?: number
              data?: {
                content?: unknown
                message?: { content?: unknown }
                name?: unknown
                toolName?: unknown
                arguments?: unknown
                input?: unknown
                output?: unknown
              }
            }
            const seq = typeof event.seq === 'number' ? event.seq : -1
            if (pruned.has(seq)) continue
            if (event.type === 'user/message') {
              const said = textOfBlocks(event.data?.content)
              if (said !== '') lines.push(\`USER: \${said}\`)
            } else if (event.type === 'assistant/message') {
              const said = textOfBlocks(event.data?.message?.content)
              if (said !== '') lines.push(\`ASSISTANT: \${said}\`)
            } else if (event.type === 'tool/call') {
              const name = typeof event.data?.name === 'string'
                ? event.data.name
                : typeof event.data?.toolName === 'string' ? event.data.toolName : 'tool'
              let args = ''
              try {
                args = JSON.stringify(event.data?.arguments ?? event.data?.input ?? {})
              } catch {
                args = ''
              }
              lines.push(\`TOOL \${name}(\${args.slice(0, 160)})\`)
            } else if (event.type === 'tool/result') {
              const said = textOfBlocks(event.data?.content)
              const body = said !== '' ? said : typeof event.data?.output === 'string' ? event.data.output : ''
              if (body !== '') lines.push(\`RESULT: \${body.length > 240 ? \`\${body.slice(0, 240)}…\` : body}\`)
            }
          }
          let text = lines.join('\\n\\n')
          let truncated = false
          if (text.length > maxChars) {
            text = text.slice(text.length - maxChars)
            const cut = text.indexOf('\\n\\n')
            if (cut > 0 && cut < 400) text = text.slice(cut + 2)
            truncated = true
          }
          sendJson(response, 200, {
            sessionId,
            text,
            chars: text.length,
            entries: lines.length,
            prunedRecords: pruned.size,
            truncated,
          })
          return
        }

`
  fs.writeFileSync(file, text.replace(anchor, block + anchor), 'utf8')
  edits.push('routes.ts /talk-map/context-window')
}

// ── C. client api ───────────────────────────────────────────────────────────
{
  const file = 'src/client/api.ts'
  let text = fs.readFileSync(file, 'utf8')
  const anchor = "      return postJson('/talk-map/last-user', { sessionIds })"
  if (!text.includes(anchor)) throw new Error('api.ts anchor missing')
  const addition = `${anchor},\n    /** The live window: what the model is given now, minus already-compressed history. */\n    contextWindow: (sessionId: string, maxChars?: number) => postJson<{\n      text: string\n      chars: number\n      entries: number\n      prunedRecords: number\n      truncated: boolean\n    }>('/talk-map/context-window', { sessionId, ...(maxChars !== undefined ? { maxChars } : {}) }),`
  // strip the comma the original line carried so we can re-add our own
  text = text.replace(`${anchor},`, addition)
  if (!text.includes("'/talk-map/context-window'")) throw new Error('api.ts patch failed')
  fs.writeFileSync(file, text, 'utf8')
  edits.push('api.ts contextWindow()')
}

// ── D. spawn panel: new mode ────────────────────────────────────────────────
{
  const file = 'src/client/SpawnPreview.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace("type SpawnMode = 'digest' | 'full'", "type SpawnMode = 'digest' | 'context' | 'full'")

  text = text.replace(
    "  const [firstMessage, setFirstMessage] = useState('')",
    `  const [firstMessage, setFirstMessage] = useState('')
  /** Fetching the live window (mode 'context' only). */
  const [contextBusy, setContextBusy] = useState(false)
  const [contextNote, setContextNote] = useState<string | undefined>(undefined)`,
  )

  text = text.replace(
    `  const modes: { id: SpawnMode; label: string }[] = [
    { id: 'digest', label: t('spawn.mode.digest') },
    { id: 'full', label: t('spawn.mode.full') },
  ]`,
    `  const modes: { id: SpawnMode; label: string }[] = [
    { id: 'digest', label: t('spawn.mode.digest') },
    { id: 'context', label: t('spawn.mode.context') },
    { id: 'full', label: t('spawn.mode.full') },
  ]`,
  )

  // fetch the window whenever the user picks that mode
  text = text.replace(
    "  const addCardAndEdge = ",
    `  // Picking "current context" loads it once: the preview is editable text, exactly like
  // the digest mode, so you can trim it before the new conversation starts.
  useEffect(() => {
    if (mode !== 'context') return
    let alive = true
    setContextBusy(true)
    setContextNote(undefined)
    void talkMapApi.contextWindow(pending.parent.sessionId)
      .then((page) => {
        if (!alive) return
        const body = page.text.trim()
        setText(body === ''
          ? ''
          : \`\${t('inject.contextHeader')}「\${pending.parent.title}」\\n\\n\${body}\\n\\n\${t('inject.contextNote')}\`)
        setContextNote(body === ''
          ? t('spawn.contextEmpty')
          : page.truncated
            ? t('spawn.contextTruncated', { n: String(page.chars) })
            : t('spawn.contextLoaded', { n: String(page.chars), m: String(page.entries) }))
      })
      .catch((error: unknown) => {
        if (alive) setContextNote(String((error as Error | undefined)?.message ?? error))
      })
      .finally(() => { if (alive) setContextBusy(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pending.parent.sessionId])

  const addCardAndEdge = `,
  )

  // confirm branch: inject the window text into a fresh session
  text = text.replace(
    "      if (mode === 'full') {",
    `      if (mode === 'context') {
        if (text.trim() === '') throw new Error(t('spawn.needText'))
        const created = await createSession()
        await talkMapApi.injectContext(created.sessionId, [
          { sessionId: pending.parent.sessionId, text },
        ])
        addCardAndEdge(created.sessionId, 'context', text)
        jumpIn(created.sessionId)
        return
      }
      if (mode === 'full') {`,
  )

  // render branch
  text = text.replace(
    `        : mode === 'none'`,
    `        : mode === 'context'
          ? (
              <>
                <div className={styles['spawnHint']}>{t('spawn.contextHint')}</div>
                {contextNote !== undefined
                  ? <div className={styles['spawnHint']}>{contextNote}</div>
                  : null}
                <textarea
                  className={\`\${styles['spawnTextarea']} nodrag nowheel\`}
                  value={contextBusy ? t('spawn.contextLoading') : text}
                  readOnly={contextBusy}
                  rows={9}
                  onChange={(event) => { setText(event.target.value) }}
                />
              </>
            )
          : mode === 'none'`,
  )

  text = text.replace(
    `          disabled={busy
            || (mode === 'digest' && text.trim() === '')
            || (mode === 'none' && firstMessage.trim() === '')}`,
    `          disabled={busy || contextBusy
            || (mode === 'digest' && text.trim() === '')
            || (mode === 'context' && text.trim() === '')
            || (mode === 'none' && firstMessage.trim() === '')}`,
  )

  fs.writeFileSync(file, text, 'utf8')
  edits.push('SpawnPreview context mode')
}

// ── E. strings ──────────────────────────────────────────────────────────────
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  const zh = [
    "  'spawn.mode.context': '当前上下文',",
    "  'spawn.contextHint': '注入这段对话**当前**发给模型的上下文（已经被压缩掉的历史不在里面）。可以编辑后再开：',",
    "  'spawn.contextLoading': '正在读取当前上下文……',",
    "  'spawn.contextEmpty': '这段对话暂时没有可注入的内容（可能刚压缩完，或还没有消息）。',",
    "  'spawn.contextLoaded': '已读取 {n} 个字符、{m} 条记录。',",
    "  'spawn.contextTruncated': '内容过长，只保留最近 {n} 个字符。',",
    "  'inject.contextHeader': '【上下文注入 · 当前上下文 · 来自】',",
    "  'inject.contextNote': '（以上是母对话当前仍在上下文里的内容；更早的部分已被压缩，不在其中。）',",
  ].join('\n')
  const en = [
    "  'spawn.mode.context': 'Current context',",
    "  'spawn.contextHint': 'Inject the context this conversation is **currently** given (already-compressed history is excluded). Edit it before you start:',",
    "  'spawn.contextLoading': 'Reading the current context…',",
    "  'spawn.contextEmpty': 'Nothing to inject right now (freshly compacted, or no messages yet).',",
    "  'spawn.contextLoaded': 'Read {n} characters across {m} records.',",
    "  'spawn.contextTruncated': 'Too long: kept the most recent {n} characters.',",
    "  'inject.contextHeader': '[Context injection · current context · from]',",
    "  'inject.contextNote': '(The above is what the parent still has in context; earlier parts were compacted away.)',",
  ].join('\n')
  const zhMode = "  'spawn.mode.digest': '摘要注入',"
  const enMode = "  'spawn.mode.digest': 'Digest injection',"
  if (!text.includes(zhMode) || !text.includes(enMode)) throw new Error('i18n mode anchors missing')
  text = text.replace(zhMode, zhMode + '\n' + zh)
  text = text.replace(enMode, enMode + '\n' + en)
  fs.writeFileSync(file, text, 'utf8')
  edits.push('i18n context strings')
}

console.log(edits.join('\n'))
