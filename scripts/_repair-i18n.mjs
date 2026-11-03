/** Rebuild i18n.ts from HEAD and re-apply only the two intended edits. */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const file = 'src/client/i18n.ts'
const base = execSync('git show HEAD:src/client/i18n.ts', { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })
const lines = base.split('\n')

const zhKeys = [
  "  'statusRail.title': '有状态的卡片',",
  "  'statusRail.open': '展开状态栏',",
  "  'statusRail.close': '收起状态栏',",
  "  'statusRail.empty': '暂时没有带状态的卡片',",
  "  'statusRail.lamp.running': '运行中',",
  "  'statusRail.lamp.waiting': '等你回复',",
  "  'statusRail.lamp.done': '待查看',",
  "  'statusRail.lamp.error': '异常终止',",
]
const enKeys = [
  "  'statusRail.title': 'Cards with a status',",
  "  'statusRail.open': 'Open the status rail',",
  "  'statusRail.close': 'Close the status rail',",
  "  'statusRail.empty': 'No card carries a status right now',",
  "  'statusRail.lamp.running': 'running',",
  "  'statusRail.lamp.waiting': 'waiting',",
  "  'statusRail.lamp.done': 'unread',",
  "  'statusRail.lamp.error': 'error',",
]

const zhEmpty = lines.findIndex(line => line.startsWith("  'map.empty': '地图是空的"))
const enEmpty = lines.findIndex(line => line.startsWith("  'map.empty': 'The map is empty"))
if (zhEmpty < 0 || enEmpty < 0) { console.log('map.empty anchors missing'); process.exit(1) }

// Insert from the bottom up so earlier indices stay valid.
const out = [...lines]
out.splice(enEmpty + 1, 0, ...enKeys)
out.splice(zhEmpty + 1, 0, ...zhKeys)

let text = out.join('\n')
text = text.replace("'b55 · 搜地图上的卡片（标题/正文）'", "'b56 · 搜地图上的卡片（标题/正文）'")
text = text.replace("'b55 · Search cards on the map'", "'b56 · Search cards on the map'")
fs.writeFileSync(file, text, 'utf8')

// Verify.
const check = fs.readFileSync(file, 'utf8')
const count = (needle) => (check.match(new RegExp(needle, 'g')) ?? []).length
console.log(JSON.stringify({
  searchPlaceholder: count("global\\.searchPlaceholder"),
  statusRailZh: count("statusRail\\.lamp\\.running': '运行中"),
  statusRailEn: count("statusRail\\.lamp\\.running': 'running"),
  menuMarkUnreadZh: check.includes("'menu.markUnread': '标为未读'"),
  batchCancelEn: check.includes("'batch.cancel': 'Cancel'"),
  stampB56: check.includes('b56 ·'),
}, null, 1))
