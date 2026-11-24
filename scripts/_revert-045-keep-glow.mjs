import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
for (const f of ['src/client/talk-map.module.css', 'src/client/StatusRail.tsx']) {
  const buf = execFileSync('git', ['show', `360f0c0:${f}`], { maxBuffer: 32 * 1024 * 1024 })
  fs.writeFileSync(f, buf)
  console.log('restored', f)
}
// 只保留光晕修复：列表内边距 + 面板额外宽度
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  gap: 10px;
  padding: 2px 0 14px;`,
    `  gap: 10px;
  /* Room for the lamp halo: an overflow:auto box clips on both axes, and the glow spreads 40px. */
  padding: 16px 18px 18px;`,
  )
  t = t.replace(
    `  --rail-w: calc(var(--rail-card-outer) + var(--rail-pad) * 2 + 26px);`,
    `  --rail-w: calc(var(--rail-card-outer) + var(--rail-pad) * 2 + 38px);`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('glow fix reapplied')
}
