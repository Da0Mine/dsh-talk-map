import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const at = lines.findIndex(line => line.trim() === 'if (listed.has(sessionId)) continue')
if (at < 0) throw new Error('anchor not found')
if (!(lines[at + 1] ?? '').includes('readFinished.has')) {
  const indent = (lines[at].match(/^\s*/) ?? [''])[0]
  lines.splice(at + 1, 0,
    `${indent}// 只有"待查看且已看过"的会话才落到最近的任务。`,
    `${indent}if (!readFinished.has(sessionId)) continue`,
  )
}
const memoEnd = lines.findIndex(line => line.trim() === '}, [rows, sessions, archivedSessionIds])')
if (memoEnd >= 0) lines[memoEnd] = '  }, [rows, sessions, archivedSessionIds, readFinished])'
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('SidebarQueue: 门槛 + 依赖')
