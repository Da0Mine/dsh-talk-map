import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 每个会话最多 25 秒重读一次：运行中的会话 updatedAt 每帧都在变，按 stamp 去重等于不停重读
if (!t.includes('lastPreviewAt')) {
  t = t.replace(
    `  const previewStamp = useRef<Map<string, number>>(`,
    `  /** Last time we actually read each session's surface — the reads are heavy, so throttle them. */
  const lastPreviewAt = useRef<Map<string, number>>(new Map())
  const PREVIEW_MIN_INTERVAL_MS = 25000
  const previewStamp = useRef<Map<string, number>>(`,
  )
  t = t.replace(
    `        if (previewStamp.current.get(card.sessionId) === stamp) continue`,
    `        if (previewStamp.current.get(card.sessionId) === stamp) continue
        // A running session's stamp changes constantly; without this throttle every tick re-read
        // the whole session surface, which starves the shell (titles stayed as raw session ids).
        if ((Date.now() - (lastPreviewAt.current.get(card.sessionId) ?? 0)) < PREVIEW_MIN_INTERVAL_MS) continue`,
  )
  t = t.replace(
    `      for (const [sessionId, stamp] of batchStamps) previewStamp.current.set(sessionId, stamp)`,
    `      for (const [sessionId, stamp] of batchStamps) {
        previewStamp.current.set(sessionId, stamp)
        lastPreviewAt.current.set(sessionId, Date.now())
      }`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 预览重读节流 25s')
}

// 2) 预热也记录时间，避免与轮询互相触发
{
  const f2 = 'src/client/MapCanvas.tsx'
  let t2 = fs.readFileSync(f2, 'utf8')
  t2 = t2.replace(
    `            previewStamp.current.set(sessionId, 0)`,
    `            previewStamp.current.set(sessionId, 0)
            lastPreviewAt.current.set(sessionId, Date.now())`,
  )
  fs.writeFileSync(f2, t2, 'utf8')
  console.log('预热记录时间')
}
