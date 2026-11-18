/** Restore the stashed draft-card work by reading blobs out of the stash (no git checkout). */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const files = [
  'src/client/SidebarQueue.tsx',
  'src/client/StatusRail.tsx',
  'src/client/MapCanvas.tsx',
  'src/client/i18n.ts',
  'src/client/talk-map.module.css',
  'test/harness.js',
]

for (const file of files) {
  const content = execFileSync('git', ['show', `stash@{0}:${file}`], { maxBuffer: 32 * 1024 * 1024 })
  fs.writeFileSync(file, content)
  console.log('restored', file, content.length, 'bytes')
}
