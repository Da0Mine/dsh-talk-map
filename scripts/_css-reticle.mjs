import fs from 'node:fs'
// 1) CSS：隐藏内侧栏滚动条 + reticle 提到最上层
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('/* The rail scrolls, but its bar is noise')) {
    t += `
/* The rail scrolls, but a scrollbar over the glass looked out of place: keep the scrolling,
   hide the bar. */
.statusRailPanel {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.statusRailPanel::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* Above the lamp ring so the brackets stay visible on a glowing card. */
.cardReticle {
  z-index: 3;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 隐藏滚动条 + reticle 层级')
  }
}

// 2) MapCanvas：currentSessionId 为空时退回"主视图保留"的那个会话
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `        recent={recentEntries}
        currentSessionId={currentSessionId()}`,
    `        recent={recentEntries}
        currentSessionId={currentSessionId() ?? mainViewSessionId}`,
  )
  t = t.replace(
    `  const recentEntries = useMemo<StatusRailEntry[]>(() => {`,
    `  /** Fallback for the reticle: the conversation the shell currently shows, if any. */
  const mainViewSessionId = useMemo(() => {
    for (const [sessionId, summary] of Object.entries(sessions.byId)) {
      if ((summary?.retainedBy?.mainView ?? 0) > 0) return sessionId
    }
    return undefined
  }, [sessions])

  const recentEntries = useMemo<StatusRailEntry[]>(() => {`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: reticle 回退到主视图会话')
}
