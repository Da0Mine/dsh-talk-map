import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 新出现的条目排到最前（而不是追加到末尾）
t = t.replace(
  `    // Anything the sync effect has not seen yet still shows up, at the end.
    for (const entry of props.recent ?? []) {
      if (!recentOrder.includes(entry.cardId)) ordered.push(entry)
    }`,
  `    // Anything the sync effect has not seen yet is BRAND NEW (just read): it belongs on top.
    // Appending it to the end was why a freshly viewed task landed at the bottom.
    const fresh = (props.recent ?? []).filter(entry => !recentOrder.includes(entry.cardId))
    ordered.unshift(...fresh)`,
)

// 2) 已读时间变化时，把该卡提到最前
t = t.replace(
  `  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)`,
  `  // Re-reading an old task must also lift it: compare the read marks and move whoever changed.
  const lastReadAt = useRef<Map<string, number>>(new Map())
  const readMarks = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())
  useEffect(() => {
    const lifted: string[] = []
    for (const [sessionId, at] of readMarks) {
      if (lastReadAt.current.get(sessionId) !== at) lifted.push(sessionId)
    }
    lastReadAt.current = new Map(readMarks)
    if (lifted.length === 0) return
    setRecentOrder(current => {
      const byCard = new Map((props.recent ?? []).map(entry => [entry.sessionId, entry.cardId]))
      const moved = lifted
        .map(sessionId => byCard.get(sessionId))
        .filter((cardId): cardId is string => cardId !== undefined && current.includes(cardId))
      if (moved.length === 0) return current
      return [...moved, ...current.filter(cardId => !moved.includes(cardId))]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readMarks])
  const recentRenderedIds = recentEntriesOrdered.map(entry => entry.cardId)`,
)

// 3) import readArchive / useSyncExternalStore 已存在则跳过
if (!t.includes("from './read-archive.ts'")) {
  t = t.replace(`import { PinMark } from './PinMark.tsx'`, `import { readArchive } from './read-archive.ts'\nimport { PinMark } from './PinMark.tsx'`)
}
fs.writeFileSync(f, t, 'utf8')
console.log('StatusRail: 新读的卡置顶')
