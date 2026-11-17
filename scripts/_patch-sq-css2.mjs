import fs from 'node:fs'
const file = 'src/client/talk-map.module.css'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(l => l.trim() === '/* ── the queue inside the native sidebar ────────────────────────────────── */')
if (start < 0) { console.log('block start missing'); process.exit(1) }
// 删到文件里下一个顶层注释或文件末尾
let end = start + 1
while (end < lines.length && !(lines[end].startsWith('/* ') && lines[end].includes('──'))) end += 1
console.log('替换行范围:', start + 1, '..', end)
const block = `/* ── the queue inside the native sidebar ────────────────────────────────────
   It renders the SAME card markup the map rail uses (.card + .statusRailCard), so the
   sidebar shows real cards, not a separate list widget. The block is capped and scrolls
   internally, which is what keeps the two original buttons (map / back-to-current) on
   screen instead of being pushed below the viewport. */
.sidebarQueue {
  display: flex;
  flex-direction: column;
  flex: 0 1 auto;
  min-height: 0;
  width: 100%;
  /* Leave room for the toggle row underneath: never claim more than this. */
  max-height: 42vh;
  padding: 4px 0 2px;
  margin-top: 4px;
  overflow: hidden;
}

.sidebarQueueHead {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: none;
  padding: 2px 10px 6px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}

.sidebarQueueHeadText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebarQueueCount {
  flex: none;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  font-variant-numeric: tabular-nums;
}

.sidebarQueueList {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 6px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

/* A rail card, squeezed into the sidebar's width (the rail's own width is wider). */
.sidebarQueueCard {
  width: auto;
  max-width: none;
  flex: none;
}
`
lines.splice(start, end - start, ...block.split('\n'))
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('sidebarQueue css rewritten; 旧 item 规则清理:', (fs.readFileSync(file,'utf8').match(/sidebarQueueItem/g) ?? []).length)
