import fs from 'node:fs'
const raw = fs.readFileSync('PROGRESS.md', 'utf8')
const lines = raw.split('\n')

const secAt = (name) => lines.findIndex(l => l.trim() === '## ' + name)
const doneAt = secAt('已完成')
const doingAt = secAt('进行中')
if (doneAt < 0 || doingAt < 0) throw new Error('sections missing')

// 已完成：条目 = 以 '- ' 开头的行组
const block = lines.slice(doneAt + 1, doingAt)
const entries = []
for (const line of block) {
  if (line.startsWith('- ')) entries.push([line])
  else if (entries.length > 0) entries[entries.length - 1].push(line)
}
// 去掉尾部空行使格式统一
const cleaned = entries.map(group => group.join('\n').replace(/\s+$/, ''))
const keep = cleaned.slice(0, 5)          // 最新 5 条（文件是最新在前的写法）
const older = cleaned.slice(5)

const stamp = '2026-11'
const archivePath = `PROGRESS-ARCHIVE-${stamp}.md`
const archiveHeader = fs.existsSync(archivePath)
  ? fs.readFileSync(archivePath, 'utf8').trimEnd() + '\n\n'
  : `# PROGRESS 归档 · ${stamp}\n\n> 从 PROGRESS.md 按「只留最近 5 条」规则原样移入，不改写、不删减。\n\n`
fs.writeFileSync(archivePath, archiveHeader + older.join('\n\n') + '\n', 'utf8')

const restore = [
  '## 恢复块',
  '- 目标：dsh-talk-map（DSH 对话地图插件）持续迭代，npm `dsh-talk-map` 已到 `0.1.96`，仓库 Da0Mine/dsh-talk-map',
  '- 当前阶段：0.1.96 已发布（地图侧栏液态玻璃 + 拖动时冻结模糊），等用户重启验收',
  '- 已完成（本轮）：液态玻璃（高光/折射边/流动光带/玻璃卡）+ 拖动降级（独立 store，不触发画布重渲染）',
  '- 下一步：用户重启后确认玻璃观感与拖拽帧率；若观感偏灰可调 `--dsw-alias-bg-elevated` 的混合比例',
  '- 决策：性能优先——画布移动时用静态渐变替代 `backdrop-filter`，静止时恢复 16px 模糊',
  '- 未决风险：浅色主题只在离线 harness 里验过（真实宿主浅色未验）；鼠标拖拽期间若高频起停可能看到模糊切换',
  '- 关键文件：`src/client/talk-map.module.css`（玻璃层）、`src/client/rail-glass.ts`、`src/client/StatusRail.tsx`、`src/client/MapCanvas.tsx`',
  '- 验证：probe 148/148；玻璃开/关 A/B 拖拽均中位 17ms、p95 19ms；`data-frozen` 拖动中 1、松手 400ms 后 0',
  '',
  '',
].join('\n')

const head = lines.slice(0, doneAt)
let out = head.join('\n') + '\n\n' + restore + '## 已完成\n\n' + keep.join('\n\n') + '\n\n'
out += lines.slice(doingAt).join('\n')
// 恢复块要放在最前面（第一行标题之后）
out = out.replace(/^(# [^\n]*\n\n)/, `$1${restore}## 已完成\n\n${keep.join('\n\n')}\n\n`)
// 去掉重复插入的那一份
out = out.replace(restore + '## 已完成\n\n' + keep.join('\n\n') + '\n\n', '')
fs.writeFileSync('PROGRESS.md', out, 'utf8')
console.log('已完成保留', keep.length, '条；归档', older.length, '条 →', archivePath)
