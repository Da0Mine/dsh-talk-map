import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)

// 1) 把 moreRef 赋值移到 ref 声明之后
const assignAt = lines.findIndex(line => line.trim() === 'moreRef.current = {')
if (assignAt >= 0) {
  const block = lines.slice(assignAt, assignAt + 4)
  lines.splice(assignAt, 4)
  const refAt = lines.findIndex(line => line.includes('const moreRef = useRef('))
  lines.splice(refAt + 1, 0, '', ...block)
  console.log('moreRef 赋值移到声明之后')
}

// 2) 在最近区块之后插入「查看更多」按钮
const anchor = lines.findIndex(line => line.trim() === '{props.recent !== undefined && unpinnedRecentEntries.length > 0')
// 找最近块结束：从 anchor 往后找到 `)}` 后紧跟 `        </div>` 的位置
let end = -1
for (let i = anchor; i < lines.length - 1; i += 1) {
  if (lines[i].trim() === ')}' && (lines[i + 1] ?? '').trim() === '</div>') { end = i + 1; break }
}
if (end > 0) {
  lines.splice(end + 1, 0,
    '          {hasMoreRecent',
    '            ? (',
    '                <button',
    '                  type="button"',
    '                  className={styles[`statusRailMore`]}',
    '                  onClick={() => { setRecentLimit(current => current + RECENT_PAGE_SIZE) }}',
    '                >',
    '                  {t(`statusRail.more`)}',
    '                </button>',
    '              )',
    '            : null}',
  )
  console.log('查看更多 按钮插入第', end + 2, '行')
} else {
  console.log('未找到插入点')
}
fs.writeFileSync(f, lines.join('\n'), 'utf8')
