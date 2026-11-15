/**
 * "Inject what this session actually carries" — no slicing by default.
 *
 * Reconstruction rules (from the real log's record shapes):
 *   • user/message      — everything the model sees as a message, incl. the runtime's own
 *                         injections; `compact-checkpoint` records ARE the summaries of the
 *                         already-compacted history, so they must stay in place.
 *   • assistant/message — the answers.
 *   • tool/call, tool/result — the tool activity (results clipped per line).
 *   • system/message    — skipped: the new session gets its own system prompt.
 *   • developer/message — skipped: tool registry / memory snapshot belong to the parent.
 *
 * maxChars = 0 (the default) means "everything"; a positive value keeps the old budgeted
 * behaviour for people who want a lighter injection.
 */
import fs from 'node:fs'

const edits = []

// ── 1. our own route must accept a multi-megabyte injection ─────────────────
{
  const file = 'src/host/routes.ts'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    'const MAX_BODY_BYTES = 1024 * 1024',
    'const MAX_BODY_BYTES = 64 * 1024 * 1024',
  )

  // ── 2. labels: keep the source kind, and mark compacted-history summaries ──
  text = text.replace(
    `            if (event.type === 'user/message') {
              const said = textOfBlocks(event.data?.content)
              if (said !== '') lines.push(\`USER: \${said}\`)`,
    `            if (event.type === 'user/message') {
              const said = textOfBlocks(event.data?.content)
              const kind = (event.data as { source?: { kind?: unknown } } | undefined)?.source?.kind
              const label = kind === 'compact-checkpoint' ? 'COMPACTED HISTORY (summary)' : typeof kind === 'string' && kind !== 'user' ? \`USER/\${kind}\` : 'USER'
              if (said !== '') lines.push(\`\${label}: \${said}\`)`,
  )

  // ── 3. maxChars = 0 means "no trimming" ───────────────────────────────────
  text = text.replace(
    "          const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 300000",
    "          const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 0",
  )
  text = text.replace(
    'const maxChars = Math.min(Math.max(requested, 4000), 3000000)',
    '// 0 = 不截断（按本次会话实际携带的全部内容注入）\n          const maxChars = requested <= 0 ? 0 : Math.min(Math.max(requested, 4000), 3000000)',
  )

  // ── 4. trimming block: only when a budget was asked for ───────────────────
  text = text.replace(
    `          let text = essential.join('\\n\\n')
          let truncated = false
          if (text.length > maxChars) {`,
    `          let text = essential.join('\\n\\n')
          let truncated = false
          if (maxChars === 0) {
            // Everything, exactly as the session carries it.
            const all = lines.join('\\n\\n')
            text = all
          } else if (text.length > maxChars) {`,
  )
  text = text.replace(
    `          } else {
            const room = maxChars - text.length`,
    `          } else if (maxChars > 0) {
            const room = maxChars - text.length`,
  )

  // ── 5. report the token estimate too ──────────────────────────────────────
  text = text.replace(
    '            availableEntries: essential.length,',
    '            availableEntries: essential.length,',
  )
  text = text.replace(
    `            essentialEntries: essential.length,
            toolEntries: tooling.length,`,
    `            essentialEntries: essential.length,
            toolEntries: tooling.length,
            approxTokens: Math.round((essentialChars + toolChars) / 2),`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('route: no trimming by default + compact-checkpoint labels + 64MB body')
}

// ── 6. panel: default 完整（不截断），其余仍可选 ────────────────────────────
{
  const file = 'src/client/SpawnPreview.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    '  const [contextBudget, setContextBudget] = useState(300000)',
    '  // 0 = 不截断：把本次会话实际携带的上下文整份注入（默认）\n  const [contextBudget, setContextBudget] = useState(0)',
  )
  text = text.replace(
    `                    { chars: 40000, label: t('spawn.budget.40k') },
                    { chars: 100000, label: t('spawn.budget.100k') },
                    { chars: 300000, label: t('spawn.budget.300k') },
                    { chars: 600000, label: t('spawn.budget.600k') },
                    { chars: 3000000, label: t('spawn.budget.all') },`,
    `                    { chars: 0, label: t('spawn.budget.all') },
                    { chars: 40000, label: t('spawn.budget.40k') },
                    { chars: 100000, label: t('spawn.budget.100k') },
                    { chars: 300000, label: t('spawn.budget.300k') },
                    { chars: 600000, label: t('spawn.budget.600k') },`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('panel: default no-trim')
}

// ── 7. strings ─────────────────────────────────────────────────────────────
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace("  'spawn.budget.all': '全部',", "  'spawn.budget.all': '完整（不截断）',")
  text = text.replace("  'spawn.budget.all': 'All',", "  'spawn.budget.all': 'Everything',")
  text = text.replace(
    "  'spawn.contextHint': '注入这段对话「当前」发给模型的上下文（已经被压缩掉的历史不在里面）。可以编辑后再开：',",
    "  'spawn.contextHint': '把这段对话当前携带的上下文整份注入（含已压缩历史的检查点摘要；系统提示词与工具定义不注入，新会话有自己的）。可以编辑后再开：',",
  )
  text = text.replace(
    "  'spawn.contextHint': 'Inject the context this conversation is currently given (already-compressed history is excluded). Edit it before you start:',",
    "  'spawn.contextHint': 'Inject the whole context this conversation currently carries (compacted history arrives as its checkpoint summaries; system prompt and tool definitions are not injected — the new session has its own). Edit it before you start:',",
  )
  text = text.replace(
    "  'spawn.contextAvailable': '可注入总量约 {a} 个字符（不含系统提示词/技能清单/工具定义，那些不在会话日志里）。',",
    "  'spawn.contextAvailable': '本次会话可注入约 {a} 个字符（≈{t} tokens）。',",
  )
  text = text.replace(
    "  'spawn.contextAvailable': 'About {a} characters are available (system prompt, skill catalog and tool definitions are not in the session log, so they are never injected).',",
    "  'spawn.contextAvailable': 'This session carries about {a} characters (≈{t} tokens).',",
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('i18n: 完整（不截断）+ token 估算')
}

console.log(edits.join('\n'))
