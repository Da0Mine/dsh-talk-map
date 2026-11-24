import fs from 'node:fs'
// 1) 默认展开
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const before = `function readOpen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}`
  const after = `function readOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(OPEN_KEY)
    // No stored choice yet: keep the queue board open. It used to start collapsed, which left
    // nothing but a transparent handle on screen and read as "the board is gone".
    return stored === null ? true : stored === '1'
  } catch {
    return true
  }
}`
  if (!t.includes(before)) throw new Error('readOpen anchor missing')
  t = t.replace(before, after)
  fs.writeFileSync(f, t, 'utf8')
  console.log('readOpen: 默认展开')
}
// 2) 把手保留一条细描边（无填充、无模糊）
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('.statusRailTab {\n  border: 1px solid rgba(255, 255, 255, 0.16);')) {
    t += `
/* The handle must stay discoverable even when the queue is empty (no count badge, no cards).
   A hairline stroke only — no fill, no blur, so it never turns into a second frosted chip. */
.statusRailTab {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-left: none;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 把手细描边')
  }
}
