import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// 定时器里顺带刷新草稿文本（内容变了才 setState，避免每 1.5s 触发重渲染）
const before = `    const timer = setInterval(() => { draftWatch.refresh() }, 1500)
    return () => { clearInterval(timer) }
  }, [])`
const after = `    const syncTexts = (): void => {
      const next = readDraftTexts()
      setDraftTexts((current) => {
        const keys = Object.keys(next)
        if (keys.length === Object.keys(current).length
          && keys.every(key => current[key] === next[key])) return current
        return next
      })
    }
    syncTexts()
    const timer = setInterval(() => {
      draftWatch.refresh()
      syncTexts()
    }, 1500)
    return () => { clearInterval(timer) }
  }, [])`
if (!text.includes(before)) throw new Error('timer block not found')
text = text.replace(before, after)

// 卡片数据：有草稿就用草稿正文
const previewBefore = `        ...(previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),
        ...(pinnedSessions.has(card.sessionId) ? { pinned: true } : {}),`
const previewAfter = `        // 待发送优先：正文显示草稿本身，而不是上一句已发送的内容。
        ...(draftTexts[card.sessionId] !== undefined && draftTexts[card.sessionId] !== ''
          ? { preview: draftTexts[card.sessionId] }
          : previews[card.sessionId] !== undefined ? { preview: previews[card.sessionId] } : {}),
        ...(pinnedSessions.has(card.sessionId) ? { pinned: true } : {}),`
if (!text.includes(previewBefore)) throw new Error('preview block not found')
text = text.replace(previewBefore, previewAfter)

// 依赖数组补 draftTexts
text = text.replace(
  "  }, [visibleCards, sessions, renamedTitles, previews, pinnedSessions, statusById, alertById, finishedById])",
  "  }, [visibleCards, sessions, renamedTitles, previews, draftTexts, pinnedSessions, statusById, alertById, finishedById])",
)
fs.writeFileSync(file, text, 'utf8')
console.log('draft text drives the card body')
