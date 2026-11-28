import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  }, [canvasState.cards, rows, sessions, finishHistory, readMarks, previews])`,
  `  }, [canvasState.cards, rows, sessions, finishHistory, readMarks, previews, archivedSessionIds])`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('依赖补 archivedSessionIds')
