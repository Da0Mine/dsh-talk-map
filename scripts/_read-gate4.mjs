import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes("from './read-archive.ts'")) {
  t = t.replace(/^import /m, `import { readArchive } from './read-archive.ts'\nimport `)
}
if (!t.includes('const readFinished = useSyncExternalStore')) {
  t = t.replace(
    `  const recentRows = useMemo(() => {`,
    `  const readFinished = useSyncExternalStore(readArchive.subscribe, () => readArchive.get())
  const recentRows = useMemo(() => {`,
  )
}
t = t.replace(
  `        if (listed.has(sessionId)) continue`,
  `        if (listed.has(sessionId)) continue
        // 只有"待查看且已看过"的会话才落到最近的任务。
        if (!readFinished.has(sessionId)) continue`,
)
t = t.replace(`  }, [rows, sessions, archivedSessionIds])`, `  }, [rows, sessions, archivedSessionIds, readFinished])`)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 门槛已加')
