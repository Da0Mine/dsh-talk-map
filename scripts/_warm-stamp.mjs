import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `          for (const [sessionId, text] of Object.entries(texts)) {
            putPreview(sessionId, text, 0)`,
  `          for (const [sessionId, text] of Object.entries(texts)) {
            putPreview(sessionId, text, 0)
            // Also mark it in the drip's stamp map so the 4 s poll does not re-read it.
            previewStamp.current.set(sessionId, 0)`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('预热结果同步给轮询')
