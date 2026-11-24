import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
for (const f of ['src/client/talk-map.module.css', 'src/client/StatusRail.tsx']) {
  const buf = execFileSync('git', ['show', `248cef9:${f}`], { maxBuffer: 32 * 1024 * 1024 })
  fs.writeFileSync(f, buf)
  console.log('restored', f, buf.length)
}
