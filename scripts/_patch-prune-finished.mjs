import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

// 任何时候只要某个"已跑完未读"的会话正处于主视图，就把它从本插件的记录里删掉：
// 否则离开那个会话后它会以「待查看」重新冒出来。
t = t.replace(
  `  // Only lamped cards, exactly like the rail.`,
  `  useEffect(() => {
    for (const sessionId of finished) {
      const summary = sessions.byId[sessionId]
      if ((summary?.retainedBy?.mainView ?? 0) > 0) sessionActivity.forget(sessionId)
    }
  }, [finished, sessions])

  // Only lamped cards, exactly like the rail.`,
)
fs.writeFileSync(file, t, 'utf8')
console.log('prune finished marks for the main view')
