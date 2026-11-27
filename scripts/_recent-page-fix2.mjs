import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) moreRef 赋值移到声明之后（当前在声明之前，TDZ）
const assignAt = lines.findIndex(line => line.trim() === 'moreRef.current = {')
if (assignAt >= 0) {
  const block = lines.slice(assignAt, assignAt + 4)
  lines.splice(assignAt, 4)
  const refAt = lines.findIndex(line => line.includes('const moreRef = useRef('))
  lines.splice(refAt + 1, 0, ...block, '')
  console.log('moreRef 赋值后移')
}

// 2) 「查看更多」按钮插到最近区块的 </> 之前（第 571 行的 })} 之后）
const mapClose = lines.findIndex((line, index) =>
  line.trim() === '})}' && (lines[index + 1] ?? '').trim() === '</>')
if (mapClose < 0) throw new Error('recent map close not found')
lines.splice(mapClose + 1, 0,
  '                {hasMoreRecent',
  '                  ? (',
  '                      <button',
  '                        type="button"',
  '                        className={styles[`statusRailMore`]}',
  '                        onClick={() => { setRecentLimit(current => current + RECENT_PAGE_SIZE) }}',
  '                      >',
  '                        {t(`statusRail.more`)}',
  '                      </button>',
  '                    )',
  '                  : null}',
)
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('查看更多 按钮插入')
