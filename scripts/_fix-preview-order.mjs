import fs from 'node:fs'
// 1) harness: 接受 { id, stamp } 或字符串
const h = 'test/harness.js'
let t = fs.readFileSync(h, 'utf8')
if (!t.includes('typeof entry === \'string\' ? entry : entry.id')) {
  t = t.replace(
    `           for (const sessionId of body?.sessionIds ?? []) {
             texts[sessionId] = userMessages[sessionId] ?? '你最后说的那句话'
           }`,
    `           for (const entry of body?.sessionIds ?? []) {
             const sessionId = typeof entry === 'string' ? entry : entry?.id
             if (typeof sessionId !== 'string') continue
             texts[sessionId] = userMessages[sessionId] ?? '你最后说的那句话'
           }`,
  )
  fs.writeFileSync(h, t, 'utf8')
  console.log('harness: last-user 接受 { id, stamp }')
}

// 2) MapCanvas: 待取预览按“最新优先”排序（新会话先出正文）
const m = 'src/client/MapCanvas.tsx'
let s = fs.readFileSync(m, 'utf8')
const before = `      // Ask for the newest PREVIEW_BATCH only; the rest arrive on later ticks, and a board
      // with a thousand cards must not fire a thousand session reads at once (issue #6).
      const batch = pending.slice(0, PREVIEW_BATCH)
      const batchStamps = stamps.slice(0, PREVIEW_BATCH)`
const after = `      // Newest first, and only PREVIEW_BATCH per tick: a board with a thousand cards must not
      // fire a thousand session reads at once (issue #6), and the fresh ones matter most.
      stamps.sort((a, b) => b[1] - a[1])
      const batchStamps = stamps.slice(0, PREVIEW_BATCH)
      const batch = batchStamps.map(([id]) => id)`
if (!s.includes(before)) throw new Error('batch anchor missing')
s = s.replace(before, after)
fs.writeFileSync(m, s, 'utf8')
console.log('MapCanvas: 预览按 stamp 倒序')

// 3) 并发从 2 提到 3（峰值仍是旧方案的 1/13）
const p = 'src/host/preview.ts'
let pp = fs.readFileSync(p, 'utf8')
pp = pp.replace('export const PREVIEW_CONCURRENCY = 2', 'export const PREVIEW_CONCURRENCY = 3')
fs.writeFileSync(p, pp, 'utf8')
console.log('preview: 并发 2 → 3')
