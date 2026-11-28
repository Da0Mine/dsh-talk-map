import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
// 修闭合：把 `}).map(...)),` 改成 `}).map(...))`，并补回 `}, [deps])`
for (let i = 0; i < lines.length; i += 1) {
  if (lines[i].includes('}).map(entry => ({ sessionId: entry.sessionId') && lines[i].trimEnd().endsWith(')),')) {
    lines[i] = lines[i].trimEnd().slice(0, -1)
  }
  if (lines[i].trim() === '[canvasState.cards, rows, sessions, finishHistory, readMarks, previews])') {
    lines[i] = '  }, [canvasState.cards, rows, sessions, finishHistory, readMarks, previews])'
  }
}
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('闭合已修')
