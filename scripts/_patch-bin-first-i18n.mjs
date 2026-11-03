import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let text = fs.readFileSync(i18n, 'utf8')
text = text.replace(
  "'confirm.removeGroup.body': '分组里的 {n} 个会话会被直接删除（不经过回收站，无法恢复），卡片和分组框同时从地图上移除。'",
  "'confirm.removeGroup.body': '分组里的 {n} 个会话会被移入回收站（可在回收站恢复），卡片和分组框同时从地图上移除。仍在运行的会话会先被停止。',\n  'confirm.removeGroup.bodyHard': '这里没有回收站插件，{n} 个会话会被直接删除（无法恢复），卡片和分组框同时从地图上移除。',",
)
text = text.replace("'confirm.removeGroup.ok': '直接删除'", "'confirm.removeGroup.ok': '移入回收站',\n  'confirm.removeGroup.okHard': '直接删除',")
text = text.replace(
  "'toast.workspaceTrashed': '已删除 {n} 个会话，分组已从地图移除'",
  "'toast.workspaceTrashed': '已把 {n} 个会话移入回收站，分组已从地图移除',\n  'toast.workspaceDeleted': '已直接删除 {n} 个会话，分组已从地图移除',",
)
text = text.replace(
  "'confirm.removeGroup.body': 'Its {n} conversations are deleted outright (no recycle bin, no undo) and the cards and frame leave the map.'",
  "'confirm.removeGroup.body': 'Its {n} conversations go to the recycle bin (restorable from there) and the cards and frame leave the map. Anything still running is stopped first.',\n  'confirm.removeGroup.bodyHard': 'No recycle bin plugin answers here, so its {n} conversations are deleted outright (no undo) and the cards and frame leave the map.',",
)
text = text.replace("'confirm.removeGroup.ok': 'Delete for good'", "'confirm.removeGroup.ok': 'Move to recycle bin',\n  'confirm.removeGroup.okHard': 'Delete for good',")
text = text.replace(
  "'toast.workspaceTrashed': 'Deleted {n} conversations; the group is off the map'",
  "'toast.workspaceTrashed': 'Moved {n} conversations to the recycle bin; the group is off the map',\n  'toast.workspaceDeleted': 'Deleted {n} conversations outright; the group is off the map',",
)
fs.writeFileSync(i18n, text, 'utf8')
console.log('copy: bin vs hard')
