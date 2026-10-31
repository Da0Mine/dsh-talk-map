/**
 * SFX：从 skills 库挑 4 个（whoosh / impact / pop / sparkle），垫进成片试听。
 *   node scripts/video-sfx.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'C:/Users/28024/.dsh/skills/video-shotcraft/assets/audio/sfx'
const OUT = path.resolve('video/promo/public/audio/sfx')
fs.mkdirSync(OUT, { recursive: true })

const picks = [
  ['transition/whoosh', null], // 目录里逐个看
  ['impact', null],
  ['light', null],
]

for (const [dir] of picks) {
  const full = path.join(SRC, dir)
  if (!fs.existsSync(full)) { console.log('missing dir:', dir); continue }
  const files = fs.readdirSync(full).filter(f => f.endsWith('.mp3')).slice(0, 8)
  for (const f of files) {
    console.log(dir + '/' + f, Math.round(fs.statSync(path.join(full, f)).size / 1024) + 'KB')
  }
}
