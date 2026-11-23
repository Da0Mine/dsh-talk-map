import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const files = ['src/client/talk-map.module.css', 'src/client/StatusRail.tsx', 'src/client/liquid-glass.ts']
for (const f of files) {
  const buf = execFileSync('git', ['show', `4da8edb:${f}`], { maxBuffer: 32 * 1024 * 1024 })
  fs.writeFileSync(f, buf)
  console.log('restored', f, buf.length, 'bytes')
}
