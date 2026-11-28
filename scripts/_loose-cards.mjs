import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

const anchor = `    if (Object.keys(added).length > 0) canvas.addCards(added)
  }, [canvasState.phase, canvasState.cards, canvasState.global, workspacesReady, wsFrames, frameRects, membersByGroup, sessions, sessionWs, boardSessionIds])`

const extra = `    // Sessions with no workspace frame at all (created outside a known workspace, or a
    // workspace that has no frame yet) used to be skipped silently: the queue listed them,
    // the map did not. Give them a loose row under everything else so the two never disagree.
    const framedGroups = new Set(Object.keys(wsFrames))
    const loose = placeableSessionIds(sessions, archivedSessionIds)
      .filter(id => !boardSessionIds.has(id))
      .filter(id => {
        const groupId = sessionWs.get(id)
        if (groupId === undefined) return true
        if (!framedGroups.has(groupId)) return false // handled by the newcomers block
        return frameRects[groupId] === undefined // framed but without a usable rect
      })
    if (loose.length > 0) {
      const existing = Object.values(canvasState.cards)
      const bottom = existing.length === 0 ? 0 : Math.max(...existing.map(card => card.y + CARD_H + GAP_Y))
      loose
        .sort((a, b) => (sessions.byId[b]?.updatedAt ?? 0) - (sessions.byId[a]?.updatedAt ?? 0))
        .forEach((sessionId, index) => {
          added[newCardId()] = {
            boardId: INBOX_BOARD_ID,
            sessionId,
            x: snap((index % 4) * (CARD_W + GAP_X)),
            y: snap(bottom + Math.floor(index / 4) * (CARD_H + GAP_Y)),
            createdAt: Date.now(),
          }
        })
    }

    if (Object.keys(added).length > 0) canvas.addCards(added)
  }, [canvasState.phase, canvasState.cards, canvasState.global, workspacesReady, wsFrames, frameRects, membersByGroup, sessions, sessionWs, boardSessionIds, archivedSessionIds])`

if (!t.includes(anchor)) throw new Error('auto-sync tail anchor missing')
t = t.replace(anchor, extra)
fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: 无归属会话兜底建卡')
