/** Steps C–E of the context mode: client API, spawn panel, strings (A and B already landed). */
import fs from 'node:fs'

const edits = []

// ── C. client api ───────────────────────────────────────────────────────────
{
  const file = 'src/client/api.ts'
  let text = fs.readFileSync(file, 'utf8')
  const anchor = `  lastUserMessages(sessionIds: readonly string[]): Promise<{ texts: Record<string, string> }> {
    return postJson('/talk-map/last-user', { sessionIds })
  },`
  if (!text.includes(anchor)) throw new Error('api.ts anchor missing')
  const addition = `${anchor}
  /**
   * The live window: what the model is given right now, minus everything compaction
   * already pruned. Powers the fork panel's "current context" mode.
   */
  contextWindow(sessionId: string, maxChars?: number): Promise<{
    text: string
    chars: number
    entries: number
    prunedRecords: number
    truncated: boolean
  }> {
    return postJson('/talk-map/context-window', { sessionId, ...(maxChars !== undefined ? { maxChars } : {}) })
  },`
  fs.writeFileSync(file, text.replace(anchor, addition), 'utf8')
  edits.push('api.ts contextWindow()')
}

// ── D. spawn panel ──────────────────────────────────────────────────────────
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

  text = text.replace(
    '  const addCardAndEdge = ',
    `  // Picking "current context" loads it once: the preview is editable text, exactly like
  // the digest mode, so it can be trimmed before the new conversation starts.
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
    "  'spawn.contextHint': '注入这段对话「当前」发给模型的上下文（已经被压缩掉的历史不在里面）。可以编辑后再开：',",
    "  'spawn.contextLoading': '正在读取当前上下文……',",
    "  'spawn.contextEmpty': '这段对话暂时没有可注入的内容（可能刚压缩完，或还没有消息）。',",
    "  'spawn.contextLoaded': '已读取 {n} 个字符、{m} 条记录。',",
    "  'spawn.contextTruncated': '内容过长，只保留最近 {n} 个字符。',",
    "  'inject.contextHeader': '【上下文注入 · 当前上下文 · 来自】',",
    "  'inject.contextNote': '（以上是母对话当前仍在上下文里的内容；更早的部分已被压缩，不在其中。）',",
  ].join('\n')
  const en = [
    "  'spawn.mode.context': 'Current context',",
    "  'spawn.contextHint': 'Inject the context this conversation is currently given (already-compressed history is excluded). Edit it before you start:',",
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
