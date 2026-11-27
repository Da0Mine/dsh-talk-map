import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = `    // The sidebar queue follows the user's own order once they drag: dragged rows keep their
    // place, rows that appeared later fall in behind by priority. Forcing the rail's priority
    // buckets here made a cross-bucket drag impossible — which looked like "no 让位 at all".
    const ranked = sortQueueRows(out)
    const byId = new Map(ranked.map(row => [row.sessionId, row]))
    const ordered = queueOrder.map(id => byId.get(id)).filter((row): row is (typeof ranked)[number] => row !== undefined)
    for (const row of ranked) if (!queueOrder.includes(row.sessionId)) ordered.push(row)
    return ordered`
const after = `    // Priority first, then the user's drag position inside that priority — the same rule the map
    // rail uses. Letting the manual order win outright made a card that just started running keep
    // its old slot, i.e. sink below drafts until something forced a re-sort.
    return sortQueueRows(out)`
if (!t.includes(before)) throw new Error('ordering block not found')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 恢复"优先级优先, 桶内手动"')
