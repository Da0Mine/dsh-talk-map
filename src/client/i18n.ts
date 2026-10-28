/**
 * Two-locale copy dictionary. The default ('auto') reads <html lang>
 * directly — the pattern dsh-plugin-market uses, so no dependency on the
 * locale service; dsh sets the document language and anything starting with
 * "zh" renders Chinese. A user who picks a language in the map header
 * overrides that, and the choice is persisted in the canvas global
 * (canvas-store pushes it back here on every state change).
 */
import type { LocalePref } from '../shared/model.ts'

export type { LocalePref }
export type Locale = 'zh' | 'en'

const zh: Record<string, string> = {
  'map.title': '对话地图 ·v2',
  'map.close': '关闭地图（Esc）',
  'map.back': '返回',
  'map.toggle': '对话地图',
  'map.empty': '地图是空的 —— 右键导入工作区或对话；双击空白直接开新对话',
  'map.sessions': '个会话',
  'map.loading': '正在加载地图……',
  'map.retry': '重试',
  'map.loadError': '地图数据加载失败：',
  'card.running': '正在运行',
  'card.ghostTitle': '会话已不存在',
  'card.remove': '移除卡片',
  'card.next': '下一步',
  'card.stale': '摘要已过期',
  'time.now': '刚刚',
  'time.m': ' 分钟前',
  'time.h': ' 小时前',
  'time.d': ' 天前',
  'card.refresh': '重新生成摘要',
  'edge.injected': '注入',
  'spawn.heading': '连线分叉：开一个带上下文的新对话',
  'spawn.from': '来源',
  'spawn.hint': '以下内容将注入新对话作为背景，可以编辑：',
  'spawn.noDigest': '（这段对话还没有摘要——可以先点卡片右上角的 ⟳ 生成，或直接在这里手写要带过去的背景。）',
  'spawn.confirm': '开新对话',
  'spawn.busy': '创建中……',
  'spawn.cancel': '取消',
  'spawn.mode.none': '不继承',
  'spawn.mode.digest': '摘要注入',
  'spawn.mode.full': '完整对话',
  'spawn.noneHint': '全新对话，只保留一条关联线。输入第一句话（回车发送）：',
  'spawn.fullHint': '新对话将携带这段对话的完整历史继续（dsh 原生分叉）。',
  'spawn.needText': '注入内容不能为空',
  'spawn.needFirstMessage': '请输入第一句话',
  'edge.none': '关联',
  'edge.full': '完整分叉',
  'inject.header': '【上下文注入 · 来自】',
  'inject.summary': '摘要：',
  'inject.findings': '关键结论：',
  'inject.next': '下一步：',
  'frame.ungrouped': '未分组',
  'card.waiting': '等你回复',
  'card.done': '待查看',
  'card.error': '异常终止',
  'card.draft': '待发送',
  'card.draftHint': '这个对话的输入框里还有没发出去的文字',
  'card.pinned': '已置顶',
  'rename.title': '重命名',
  'rename.placeholder': '新的标题',
  'rename.confirm': '确定',
  'rename.cancel': '取消',
  'rename.saving': '保存中…',
  'rename.failed': '改名失败，请重试',
  'rename.unavailable': '改名通道不可用（连接还没就绪）',
  'toast.renamed': '已重命名',
  'card.interrupted': '已中断',
  'card.interruptedHint': '上次关闭时这个对话还在跑',
  'card.clickHint': '单击打开',
  'color.toolbar': '工作区颜色',
  'color.clear': '清除颜色',
  'spawn.apiUnavailable': '界面服务还在初始化，稍等一下再试',
  'frame.unknown': '分组',
  'frame.hiddenTitle': '还有卡片被折叠在框外，放大分组框可见',
  'stack.open': '展开这一堆对话',
  'stack.total': '共 {n} 个对话',
  'stack.hint': '滚轮上下切换',
  'stack.close': '收起（Esc）',
  'stack.searchPlaceholder': '搜索标题，也能搜全部对话内容',
  'stack.searching': '全文搜索中…',
  'stack.searchFailed': '全文搜索失败',
  'stack.searchDisabled': '全文搜索未启用（本机索引关闭）',
  'stack.noTitleMatch': '没有标题匹配的对话',
  'stack.contentHits': '全部对话里的命中 · {n} 条',
  'menu.empty': '（没有可选项）',
  'menu.search': '搜索…',
  'menu.alreadyImported': '已在地图 · 点击同步新会话',
  'menu.newWs': '＋ 新建工作区…',
  'menu.createAndImport': '创建并导入',
  'menu.working': '处理中……',
  'map.zoom100': '恢复 100% 缩放',
  'menu.newChat': '新对话',
  'menu.newChatIn': '新对话（{ws}）',
  'menu.pin': '置顶会话',
  'menu.unpin': '取消置顶',
  'menu.archive': '归档会话',
  'menu.deleteSession': '删除会话（回收站）',
  'menu.batch': '批量操作…',
  'batch.title': '批量操作',
  'batch.count': '已选 {n} 个对话',
  'batch.archive': '归档',
  'batch.delete': '删除',
  'batch.cancel': '取消',
  'toast.pinned': '已置顶',
  'toast.unpinned': '已取消置顶',
  'toast.pinFailed': '置顶失败：',
  'toast.archived': '已归档 {n} 个会话',
  'toast.deleted': '已把 {n} 个会话移入回收站',
  'toast.archiveFailed': '归档失败：',
  'toast.deleteFailed': '删除失败：',
  'toast.needUiWorkspace': '界面服务还没就绪，稍等一下再试',
  'menu.importWs': '导入工作区',
  'menu.importSession': '导入对话',
  'menu.moveGroup': '移动到分组（仅地图）',
  'menu.noGroup': '移出分组（自由卡片）',
  'menu.open': '打开对话',
  'menu.markUnread': '标为未读',
  'font.group': '文字大小',
  'font.increase': '加大字号（每一项 +1）',
  'font.decrease': '减小字号（每一项 −1）',
  'font.reset': '恢复默认字号',
  'font.resetShort': '默认',
  'menu.rename': '重命名',
  'menu.renameWorkspace': '重命名工作区',
  'menu.removeCard': '从地图移除',
  'edge.push': '推送最新摘要',
  'edge.pushNoDigest': '来源还没有摘要',
  'edge.delete': '删除连线',
  'toast.pushed': '已推送给「{to}」',
  'toast.notLive': '目标对话未激活——先打开它一次再推送',
  'toast.pushFailed': '推送失败：',
  'push.header': '【来自「{from}」的更新 · {time}】',
  'lang.hint': '界面语言：{current} · 点击切换到{next}',
  'lang.auto': '自动',
  'lang.zh': '中文',
  'lang.en': 'English',
  'menu.syncGroup': '同步该工作区的新会话',
  'menu.removeGroup': '移除分组（连同卡片）',
}
const en: Record<string, string> = {
  'map.title': 'Talk Map ·v2',
  'map.close': 'Close map (Esc)',
  'map.back': 'Back',
  'map.toggle': 'Talk Map',
  'map.empty': 'The map is empty — right-click to import a workspace or conversation; double-click to start a chat',
  'map.sessions': 'sessions',
  'map.loading': 'Loading map…',
  'map.retry': 'Retry',
  'map.loadError': 'Failed to load map data:',
  'card.running': 'running',
  'card.ghostTitle': 'Session no longer exists',
  'card.remove': 'Remove card',
  'card.next': 'Next',
  'card.stale': 'digest stale',
  'time.now': 'now',
  'time.m': 'm ago',
  'time.h': 'h ago',
  'time.d': 'd ago',
  'card.refresh': 'Regenerate digest',
  'edge.injected': 'injected',
  'spawn.heading': 'Fork with context',
  'spawn.from': 'From',
  'spawn.hint': 'This text will be injected into the new session as background — edit freely:',
  'spawn.noDigest': '(No digest yet — hit ⟳ on the card first, or write the context to carry over by hand.)',
  'spawn.confirm': 'Start session',
  'spawn.busy': 'Creating…',
  'spawn.cancel': 'Cancel',
  'spawn.mode.none': 'No context',
  'spawn.mode.digest': 'Inject digest',
  'spawn.mode.full': 'Full history',
  'spawn.noneHint': 'A fresh conversation, linked visually only. Type the first message (Enter sends):',
  'spawn.fullHint': 'The new conversation continues with this one\'s FULL history (dsh-native fork).',
  'spawn.needText': 'Injection text must not be empty',
  'spawn.needFirstMessage': 'Type the first message',
  'edge.none': 'linked',
  'edge.full': 'full fork',
  'inject.header': '[Context injected from] ',
  'inject.summary': 'Summary: ',
  'inject.findings': 'Key findings:',
  'inject.next': 'Next step: ',
  'frame.ungrouped': 'Ungrouped',
  'card.waiting': 'needs you',
  'card.done': 'unread',
  'card.error': 'failed',
  'card.draft': 'unsent',
  'card.draftHint': 'This conversation has text typed but not sent',
  'card.pinned': 'pinned',
  'rename.title': 'Rename',
  'rename.placeholder': 'New title',
  'rename.confirm': 'Rename',
  'rename.cancel': 'Cancel',
  'rename.saving': 'Saving…',
  'rename.failed': 'Rename failed, try again',
  'rename.unavailable': 'Rename channel unavailable (connection not ready)',
  'toast.renamed': 'Renamed',
  'card.interrupted': 'interrupted',
  'card.interruptedHint': 'This conversation was still running when the app closed',
  'card.clickHint': 'click to open',
  'color.toolbar': 'Workspace colour',
  'color.clear': 'Clear colour',
  'spawn.apiUnavailable': 'The UI services are still starting up — try again in a moment',
  'frame.unknown': 'Group',
  'frame.hiddenTitle': 'Some cards are folded outside the frame — enlarge it to see them',
  'stack.open': 'Open this stack of conversations',
  'stack.total': '{n} conversations',
  'stack.searchPlaceholder': 'Search titles, or all conversation content',
  'stack.searching': 'Searching…',
  'stack.noTitleMatch': 'No title matches',
  'stack.contentHits': 'Matches in all conversations · {n}',
  'stack.searchFailed': 'Full-text search failed',
  'stack.searchDisabled': 'Full-text search is off (session index disabled)',
  'stack.hint': 'Scroll to page',
  'stack.close': 'Close (Esc)',
  'menu.empty': '(nothing to pick)',
  'menu.search': 'Search…',
  'menu.alreadyImported': 'on map · click to sync new sessions',
  'menu.newWs': '＋ New workspace…',
  'menu.createAndImport': 'Create & import',
  'menu.working': 'Working…',
  'map.zoom100': 'Reset zoom to 100%',
  'menu.newChat': 'New conversation',
  'menu.newChatIn': 'New conversation ({ws})',
  'menu.pin': 'Pin conversation',
  'menu.unpin': 'Unpin',
  'menu.archive': 'Archive conversation',
  'menu.deleteSession': 'Delete conversation (recycle bin)',
  'menu.batch': 'Batch actions…',
  'batch.title': 'Batch actions',
  'batch.count': '{n} selected',
  'batch.archive': 'Archive',
  'batch.delete': 'Delete',
  'batch.cancel': 'Cancel',
  'toast.pinned': 'Pinned',
  'toast.unpinned': 'Unpinned',
  'toast.pinFailed': 'Pin failed: ',
  'toast.archived': 'Archived {n} conversation(s)',
  'toast.deleted': 'Moved {n} conversation(s) into the recycle bin',
  'toast.archiveFailed': 'Archive failed: ',
  'toast.deleteFailed': 'Delete failed: ',
  'toast.needUiWorkspace': 'The UI services are still starting up — try again in a moment',
  'menu.importWs': 'Import workspace',
  'menu.importSession': 'Import conversation',
  'menu.moveGroup': 'Move to group (map only)',
  'menu.noGroup': 'Remove from group (free card)',
  'menu.open': 'Open conversation',
  'menu.markUnread': 'Mark as unread',
  'font.group': 'Text size',
  'font.increase': 'Larger text (+1 on every style)',
  'font.decrease': 'Smaller text (−1 on every style)',
  'font.reset': 'Default text size',
  'font.resetShort': 'Default',
  'menu.rename': 'Rename',
  'menu.renameWorkspace': 'Rename workspace',
  'menu.removeCard': 'Remove from map',
  'edge.push': 'Push latest digest',
  'edge.pushNoDigest': 'source has no digest yet',
  'edge.delete': 'Delete edge',
  'toast.pushed': 'Pushed to "{to}"',
  'toast.notLive': 'Target conversation is not active — open it once, then push again',
  'toast.pushFailed': 'Push failed: ',
  'push.header': '[Update from "{from}" · {time}]',
  'lang.hint': 'Interface language: {current} · click to switch to {next}',
  'lang.auto': 'Auto',
  'lang.zh': '中文',
  'lang.en': 'English',
  'menu.syncGroup': 'Sync new sessions of this workspace',
  'menu.removeGroup': 'Remove group (with its cards)',
}

/** The order the header button cycles through. */
export const LOCALE_CYCLE: readonly LocalePref[] = ['auto', 'zh', 'en']

let preference: LocalePref = 'auto'
const localeListeners = new Set<() => void>()

function documentLocale(): Locale {
  if (typeof document === 'undefined') return 'en'
  return (document.documentElement.lang ?? '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** What the stored setting says; 'auto' when the user never picked one. */
export function localePref(): LocalePref {
  return preference
}

/** The language actually rendered right now. */
export function activeLocale(): Locale {
  return preference === 'auto' ? documentLocale() : preference
}

/**
 * Apply a preference. Notifying only on a real change matters: canvas-store
 * calls this on EVERY state change (card drags included), and a notification
 * remounts the whole overlay.
 */
export function setLocalePref(next: LocalePref): void {
  if (next === preference) return
  preference = next
  for (const listener of localeListeners) listener()
}

export function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener)
  return () => { localeListeners.delete(listener) }
}

/**
 * Translate, optionally interpolating {name} placeholders. Single-pass
 * regex interpolation is the ONLY sanctioned way to fill templates:
 * chained String.replace at call sites both expands $-patterns lurking in
 * real values (conversation titles) and re-scans earlier insertions (a
 * title containing a literal "{time}" would swallow the next parameter).
 */
export function t(key: string, params?: Record<string, string>): string {
  const dict = activeLocale() === 'zh' ? zh : en
  const template = dict[key] ?? en[key] ?? key
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match)
}
