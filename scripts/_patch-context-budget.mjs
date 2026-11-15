/**
 * Fix the "why so few characters" surprise: the 40 000-char cap was hard-coded.
 *
 *   • the route now reports how much text is actually available (essential / tool / total)
 *     and accepts a much larger budget;
 *   • the fork panel lets the user pick a budget (4万 / 10万 / 30万 / 60万 / 全部) and shows
 *     "available N chars, kept M" so the number on screen is explainable.
 */
import fs from 'node:fs'

const edits = []

// ── 1. route: report the totals, raise the ceiling ─────────────────────────
{
  const file = 'src/host/routes.ts'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    "const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 40000",
    "const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 300000",
  )
  text = text.replace(
    'const maxChars = Math.min(Math.max(requested, 4000), 400000)',
    'const maxChars = Math.min(Math.max(requested, 4000), 3000000)',
  )

  text = text.replace(
    `          sendJson(response, 200, {
            sessionId,
            text,
            chars: text.length,
            entries: lines.length,
            prunedRecords: pruned.size,
            truncated,
          })`,
    `          const essentialChars = essential.join('\\n\\n').length
          const toolChars = tooling.join('\\n\\n').length
          sendJson(response, 200, {
            sessionId,
            text,
            chars: text.length,
            entries: lines.length,
            prunedRecords: pruned.size,
            truncated,
            // So the panel can say "available X, kept Y" instead of surprising the user.
            availableChars: essentialChars + toolChars,
            essentialChars,
            toolChars,
            essentialEntries: essential.length,
            toolEntries: tooling.length,
          })`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('route: totals + 3M ceiling')
}

// ── 2. client api: widen the return type ───────────────────────────────────
{
  const file = 'src/client/api.ts'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    `  contextWindow(sessionId: string, maxChars?: number): Promise<{
    text: string
    chars: number
    entries: number
    prunedRecords: number
    truncated: boolean
  }> {`,
    `  contextWindow(sessionId: string, maxChars?: number): Promise<{
    text: string
    chars: number
    entries: number
    prunedRecords: number
    truncated: boolean
    availableChars: number
    essentialChars: number
    toolChars: number
    essentialEntries: number
    toolEntries: number
  }> {`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('api: richer return type')
}

// ── 3. panel: budget picker + honest numbers ───────────────────────────────
{
  const file = 'src/client/SpawnPreview.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    `  const [contextBusy, setContextBusy] = useState(false)
  const [contextNote, setContextNote] = useState<string | undefined>(undefined)`,
    `  const [contextBusy, setContextBusy] = useState(false)
  const [contextNote, setContextNote] = useState<string | undefined>(undefined)
  /** Character budget for the 'context' mode — the old 40k hard cap surprised people. */
  const [contextBudget, setContextBudget] = useState(300000)
  const [contextStats, setContextStats] = useState<{ available: number; kept: number } | undefined>(undefined)`,
  )

  // pass the budget + remember the totals
  text = text.replace(
    '    void talkMapApi.contextWindow(pending.parent.sessionId)',
    '    void talkMapApi.contextWindow(pending.parent.sessionId, contextBudget)',
  )
  text = text.replace(
    `        setContextNote(body === ''
          ? t('spawn.contextEmpty')
          : page.truncated
            ? t('spawn.contextTruncated', { n: String(page.chars) })
            : t('spawn.contextLoaded', { n: String(page.chars), m: String(page.entries) }))`,
    `        setContextStats({ available: page.availableChars, kept: page.chars })
        setContextNote(body === ''
          ? t('spawn.contextEmpty')
          : t(page.truncated ? 'spawn.contextTruncated' : 'spawn.contextLoaded', {
              n: String(page.chars),
              m: String(page.entries),
              a: String(page.availableChars),
              e: String(page.essentialChars),
              u: String(page.toolChars),
            }))`,
  )
  text = text.replace(
    '  }, [mode, pending.parent.sessionId])',
    '  }, [mode, pending.parent.sessionId, contextBudget])',
  )

  // budget buttons under the hint
  text = text.replace(
    `                <div className={styles['spawnHint']}>{t('spawn.contextHint')}</div>
                {contextNote !== undefined
                  ? <div className={styles['spawnHint']}>{contextNote}</div>
                  : null}`,
    `                <div className={styles['spawnHint']}>{t('spawn.contextHint')}</div>
                <div className={styles['spawnModes']} role="group" aria-label={t('spawn.contextBudget')}>
                  {[
                    { chars: 40000, label: t('spawn.budget.40k') },
                    { chars: 100000, label: t('spawn.budget.100k') },
                    { chars: 300000, label: t('spawn.budget.300k') },
                    { chars: 600000, label: t('spawn.budget.600k') },
                    { chars: 3000000, label: t('spawn.budget.all') },
                  ].map(option => (
                    <button
                      key={option.chars}
                      type="button"
                      className={\`\${styles['spawnModeBtn']}\${contextBudget === option.chars ? \` \${styles['spawnModeActive']}\` : ''}\`}
                      onClick={() => { setContextBudget(option.chars) }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {contextNote !== undefined
                  ? <div className={styles['spawnHint']}>{contextNote}</div>
                  : null}
                {contextStats !== undefined
                  ? <div className={styles['spawnHint']}>{t('spawn.contextAvailable', { a: String(contextStats.available) })}</div>
                  : null}`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('panel: budget picker + available line')
}

// ── 4. strings ─────────────────────────────────────────────────────────────
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  const zh = [
    "  'spawn.contextBudget': '注入体积',",
    "  'spawn.budget.40k': '4 万字符',",
    "  'spawn.budget.100k': '10 万',",
    "  'spawn.budget.300k': '30 万',",
    "  'spawn.budget.600k': '60 万',",
    "  'spawn.budget.all': '全部',",
    "  'spawn.contextAvailable': '可注入总量约 {a} 个字符（不含系统提示词/技能清单/工具定义，那些不在会话日志里）。',",
  ].join('\n')
  const en = [
    "  'spawn.contextBudget': 'Injection size',",
    "  'spawn.budget.40k': '40k chars',",
    "  'spawn.budget.100k': '100k',",
    "  'spawn.budget.300k': '300k',",
    "  'spawn.budget.600k': '600k',",
    "  'spawn.budget.all': 'All',",
    "  'spawn.contextAvailable': 'About {a} characters are available (system prompt, skill catalog and tool definitions are not in the session log, so they are never injected).',",
  ].join('\n')
  const zhLoaded = "  'spawn.contextLoaded': '已读取 {n} 个字符、{m} 条记录。',"
  const zhTrunc = "  'spawn.contextTruncated': '内容过长，只保留最近 {n} 个字符。',"
  const enLoaded = "  'spawn.contextLoaded': 'Read {n} characters across {m} records.',"
  const enTrunc = "  'spawn.contextTruncated': 'Too long: kept the most recent {n} characters.',"
  if (!text.includes(zhLoaded) || !text.includes(enLoaded)) throw new Error('i18n budget anchors missing')
  text = text.replace(
    zhLoaded,
    "  'spawn.contextLoaded': '已注入 {n} 个字符、{m} 条记录（人机 {e} 字符，工具 {u} 字符）。',",
  )
  text = text.replace(
    zhTrunc,
    "  'spawn.contextTruncated': '超出所选的注入体积，只保留最近 {n} 个字符（可注入总量 {a} 字符：人机 {e}、工具 {u}）。',",
  )
  text = text.replace(
    enLoaded,
    "  'spawn.contextLoaded': 'Injected {n} characters across {m} records ({e} human, {u} tool).',",
  )
  text = text.replace(
    enTrunc,
    "  'spawn.contextTruncated': 'Over the chosen size: kept the most recent {n} characters (available {a}: {e} human, {u} tool).',",
  )
  const zhMode = "  'spawn.mode.context': '当前上下文',"
  const enMode = "  'spawn.mode.context': 'Current context',"
  text = text.replace(zhMode, zhMode + '\n' + zh)
  text = text.replace(enMode, enMode + '\n' + en)
  fs.writeFileSync(file, text, 'utf8')
  edits.push('i18n budget strings')
}

console.log(edits.join('\n'))
