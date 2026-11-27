import fs from 'node:fs'
for (const f of ['src/client/StatusRail.tsx', 'src/client/SidebarQueue.tsx']) {
  let t = fs.readFileSync(f, 'utf8')
  const before = `      const kept = current.filter(id => recentIds.includes(id))
      const added = recentIds.filter(id => !kept.includes(id))
      const next = [...kept, ...added]`
  const after = `      const kept = current.filter(id => recentIds.includes(id))
      const added = recentIds.filter(id => !kept.includes(id))
      // New arrivals go on TOP: this list is ordered by "last read", so appending them at the
      // end was exactly why a task you just looked at sank to the bottom.
      const next = [...added, ...kept]`
  if (!t.includes(before)) { console.log('未命中:', f); continue }
  t = t.replace(before, after)
  fs.writeFileSync(f, t, 'utf8')
  console.log('修好同步顺序:', f)
}
