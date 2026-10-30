/** Card menu: 查看摘要 — plus the "go read the full transcript" reminder. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- 1. digest text: append the reminder ------------------------------
let digest = fs.readFileSync('src/client/digest-text.ts', 'utf8')
digest = digest.replace(
  J([
    "  if (digest === undefined || digestIsEmpty(digest)) {",
    "    return `${header}\\n${t('spawn.noDigest')}`",
    '  }',
    "  return [header, ...digestBody(digest)].join('\\n')",
  ]),
  J([
    "  if (digest === undefined || digestIsEmpty(digest)) {",
    "    return `${header}\\n${t('spawn.noDigest')}`",
    '  }',
    '  // The recipient must know where the details live: a digest is an outline,',
    '  // not the conversation.',
    "  return [header, ...digestBody(digest), t('inject.recall', { title })].join('\\n')",
  ]),
)
digest = digest.replace(
  "  return [header, ...digestBody(digest)].join('\\n')",
  "  return [header, ...digestBody(digest), t('inject.recall', { title })].join('\\n')",
)
fs.writeFileSync('src/client/digest-text.ts', digest, 'utf8')

// ---- 2. i18n ----------------------------------------------------------
let i18n = fs.readFileSync('src/client/i18n.ts', 'utf8')
const zh = J([
  "  'inject.header': '【上下文注入 · 来自】',",
  "  'inject.recall': '【提醒】以上是摘要提纲，不是完整对话。需要细节（具体命令、参数、结论出处）时，请随时回到原会话「{title}」查看完整对话记录。',",
])
i18n = i18n.replace("  'inject.header': '【上下文注入 · 来自】',", zh)
const en = J([
  "  'inject.header': '[Context injected from] ',",
  "  'inject.recall': '[Note] This is a summary, not the full conversation. Go back to \"{title}\" whenever you need the details (exact commands, parameters, where a conclusion came from).',",
])
i18n = i18n.replace("  'inject.header': '[Context injected from] ',", en)
// dialog + menu labels
i18n = i18n.replace(
  "  'menu.markUnread': '标为未读',",
  J([
    "  'menu.markUnread': '标为未读',",
    "  'menu.viewDigest': '查看摘要',",
    "  'digest.title': '这会推送到其他会话的摘要',",
    "  'digest.pushLabel': '推送时（带时间戳的更新）',",
    "  'digest.injectLabel': '新建会话时（背景注入）',",
    "  'digest.empty': '这条对话还没有摘要，先刷新摘要再来看。',",
    "  'digest.copy': '复制',",
    "  'digest.close': '关闭',",
  ]),
)
i18n = i18n.replace(
  "  'menu.markUnread': 'Mark unread',",
  J([
    "  'menu.markUnread': 'Mark unread',",
    "  'menu.viewDigest': 'View digest',",
    "  'digest.title': 'The digest that gets pushed',",
    "  'digest.pushLabel': 'When pushed (timestamped update)',",
    "  'digest.injectLabel': 'When creating a session (background)',",
    "  'digest.empty': 'No digest for this conversation yet — refresh it first.',",
    "  'digest.copy': 'Copy',",
    "  'digest.close': 'Close',",
  ]),
)
fs.writeFileSync('src/client/i18n.ts', i18n, 'utf8')

// ---- 3. icon ----------------------------------------------------------
let icons = fs.readFileSync('src/client/MenuIcons.tsx', 'utf8')
icons = icons.replace("  | 'group'", "  | 'group'\n  | 'digest'")
icons = icons.replace(
  'const PATHS: Record<MenuIconName, React.JSX.Element> = {',
  J([
    'const PATHS: Record<MenuIconName, React.JSX.Element> = {',
    '  digest: (',
    '    <>',
    '      <path fill="currentColor" d="M5 2h10l4 4v16H5V2zm9 1.5V7h3.5L14 3.5zM7 11h10v1.6H7V11zm0 3.4h10v1.6H7v-1.6zm0 3.4h6.5V19H7v-1.2z" />',
    '    </>',
    '  ),',
  ]),
)
fs.writeFileSync('src/client/MenuIcons.tsx', icons, 'utf8')

// ---- 4. MapCanvas: menu entry + dialog --------------------------------
let canvas = fs.readFileSync('src/client/MapCanvas.tsx', 'utf8')
canvas = canvas.replace(
  J([
    "      items.push({",
    "        key: 'rename',",
    "        icon: 'rename',",
  ]),
  J([
    '      // Read-only: the exact text this card would push to another session.',
    "      items.push({",
    "        key: 'view-digest',",
    "        icon: 'digest',",
    "        label: t('menu.viewDigest'),",
    '        ...(digestIsEmpty(digestOf(cardId)) ? { hint: t('digest.empty'), disabled: true } : {}),',
    '        onPick: () => {',
    '          close()',
    "          setDigestTarget({",
    "            title: renamedTitles[card?.sessionId ?? ''] ?? sessions.byId[card?.sessionId ?? '']?.displayTitle ?? '',",
    '            digest: digestOf(cardId),',
    '          })',
    '        },',
    '      })',
    "      items.push({",
    "        key: 'rename',",
    "        icon: 'rename',",
  ]),
)
fs.writeFileSync('src/client/MapCanvas.tsx', canvas, 'utf8')

console.log('digest dialog wired (needs state + render)')
