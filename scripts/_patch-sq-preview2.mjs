import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

// 1) 把 memo 恢复成 rows（只算卡片+标题+草稿）
t = t.replace('  const rowsWithBody = useMemo(() => {\n    const entries', '  const rows = useMemo(() => {\n    const entries')

// 2) effect 之后、return 之前，插入 rowsWithBody（合并 body）
t = t.replace(
  `  if (rowsWithBody.length === 0) return null`,
  `  // "待发送" wins over the last sent message, exactly like the map cards.
  const rowsWithBody = useMemo(
    () => rows.map(row => {
      const draft = row.draft
      const body = draft !== undefined && draft.trim() !== ''
        ? draft
        : previews[row.sessionId]
      return { ...row, body: body !== undefined && body.trim() !== '' ? body : undefined }
    }),
    [rows, previews],
  )

  if (rowsWithBody.length === 0) return null`,
)
fs.writeFileSync(file, t, 'utf8')
console.log('rows/rowsWithBody split fixed')
