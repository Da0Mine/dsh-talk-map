/**
 * BGM 选型：把 skills 库里的候选曲依次垫进片长，量响度峰值。
 *   node scripts/video-bgm.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BGMDIR = 'C:/Users/28024/.dsh/skills/video-shotcraft/assets/audio/bgm'
const OUT = path.resolve('video/promo/public/audio')
fs.mkdirSync(OUT, { recursive: true })

const candidates = fs.readdirSync(BGMDIR).filter(f => f.endsWith('.mp3'))
console.log('candidates:', candidates.join(', '))

for (const file of candidates) {
  const full = path.join(BGMDIR, file)
  try {
    const dur = execFileSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', full], { encoding: 'utf8' }).trim()
    const peak = execFileSync('ffmpeg', ['-i', full, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const max = /max_volume:\s*([-\d.]+) dB/.exec(peak)?.[1] ?? '?'
    console.log(`${file}  ${Number(dur).toFixed(1)}s  peak ${max} dB`)
  } catch (error) {
    console.log(file, 'ERR', String(error).slice(0, 80))
  }
}
