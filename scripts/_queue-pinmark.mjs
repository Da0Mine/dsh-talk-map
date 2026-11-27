import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) pinnedExtra 块里的 emoji → PinMark，并移到标题前
const emojiAt = lines.findIndex(line => line.includes("cardPinIcon") && line.includes('📌'))
if (emojiAt >= 0) {
  const titleAt = lines.findIndex((line, index) => index === emojiAt - 1 && line.includes("cardTitle"))
  if (titleAt >= 0) {
    lines.splice(titleAt, 2, '                <PinMark />', '                <span className={styles[`cardTitle`]}>{row.title}</span>')
  }
}
// 2) 注释里的 emoji 去掉
const commentAt = lines.findIndex(line => line.includes('queue row look (and the'))
if (commentAt >= 0) lines[commentAt] = '          // Pinned recent sessions rendered with the queue row look (and the pin mark).'

// 3) 主行与最近行：标题前插入 PinMark
let inserted = 0
for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]
  if (!line.includes("styles['cardTitle']") || !line.includes('{row.title}')) continue
  const prev = lines[i - 1] ?? ''
  if (prev.includes('PinMark')) continue
  const indent = (line.match(/^\s*/) ?? [''])[0]
  lines.splice(i, 0, `${indent}{isPinnedSession(localPinSet, row.sessionId) ? <PinMark /> : null}`)
  inserted += 1
  i += 1
}
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('SidebarQueue: 插入 PinMark 处 =', inserted)
