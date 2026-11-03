import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let text = fs.readFileSync(i18n, 'utf8')
text = text.replace("'confirm.removeGroup.title': '移除这个分组？'", "'confirm.removeGroup.title': '删除这个分组？'")
text = text.replace(
  "'confirm.removeGroup.body': '只会从地图上移走 {n} 张卡片和这个分组框——会话本身还在侧栏，不会被删除，也不会进回收站。再导入这个工作区就能恢复。'",
  "'confirm.removeGroup.body': '分组里的 {n} 个会话会被移入回收站（可在回收站恢复），卡片和分组框同时从地图上移除。仍在运行的会话会先被停止。'",
)
text = text.replace("'confirm.removeGroup.ok': '移除'", "'confirm.removeGroup.ok': '移入回收站'")
text = text.replace("'confirm.removeGroup.title': 'Remove this group?'", "'confirm.removeGroup.title': 'Delete this group?'")
text = text.replace(
  "'confirm.removeGroup.body': 'This only takes {n} cards and the group frame off the map — the conversations stay in the sidebar, nothing is deleted and nothing goes to the recycle bin. Re-importing the workspace brings it back.'",
  "'confirm.removeGroup.body': 'Its {n} conversations go to the recycle bin (restorable from there) and the cards and frame leave the map. Anything still running is stopped first.'",
)
text = text.replace("'confirm.removeGroup.ok': 'Remove'", "'confirm.removeGroup.ok': 'Move to recycle bin'")
text = text.replace("'menu.removeGroup': '移除分组（连同卡片）'", "'menu.removeGroup': '删除分组（连同会话）'")
text = text.replace("'menu.removeGroup': 'Remove group (with its cards)'", "'menu.removeGroup': 'Delete group (with its conversations)'")
text = text.replace(
  "  'confirm.cancel': '取消',",
  "  'confirm.cancel': '取消',\n  'toast.workspaceTrashed': '已把 {n} 个会话移入回收站，分组已从地图移除',",
)
text = text.replace(
  "  'confirm.cancel': 'Cancel',",
  "  'confirm.cancel': 'Cancel',\n  'toast.workspaceTrashed': 'Moved {n} conversations to the recycle bin; the group is off the map',",
)
fs.writeFileSync(i18n, text, 'utf8')
console.log('copy updated')
