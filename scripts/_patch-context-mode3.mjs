import fs from 'node:fs'

// 1) i18n: the real EN anchor is 'Inject digest'
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
  const enMode = "  'spawn.mode.digest': 'Inject digest',"
  if (!text.includes(zhMode) || !text.includes(enMode)) throw new Error('i18n anchors still missing')
  if (!text.includes("'spawn.mode.context'")) {
    text = text.replace(zhMode, zhMode + '\n' + zh)
    text = text.replace(enMode, enMode + '\n' + en)
  }
  fs.writeFileSync(file, text, 'utf8')
}

// 2) build script must also refresh lib/index.js
{
  const pkgPath = 'package.json'
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  if (!pkg.scripts.build.includes('copy-host')) {
    pkg.scripts.build = 'tsdown && node scripts/copy-host.mjs && node scripts/normalize-client-banner.mjs'
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
}
console.log('i18n + build script updated')
