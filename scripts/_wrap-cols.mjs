import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')

const before = `  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;`
const after = `  overflow-y: auto;
  /* Row flow with wrapping: cards keep their size, a wider rail simply fits more columns. */
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: flex-start;
  gap: 10px;`
if (!t.includes(before)) throw new Error('list rule anchor missing')
t = t.replace(before, after)

// 槽位宽度 = 卡片外框宽度，两个才并得下
t = t.replace(
  `.statusRailSlot {
  position: relative;
}`,
  `.statusRailSlot {
  position: relative;
  /* = card outer width, so two slots fit side by side once the rail is wide enough. */
  width: var(--rail-card-outer);
  flex: 0 0 auto;
}`,
)

// 卡片去掉 backdrop-filter（每个卡片一层背景快照，拖宽时同样会拖影，且实测拖拽 17 → 23ms）
t = t.replace(
  `  border-color: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(6px) saturate(1.15);
  -webkit-backdrop-filter: blur(6px) saturate(1.15);`,
  `  border-color: rgba(255, 255, 255, 0.14);`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('CSS: 列表改为横向换行；槽位定宽；卡片去掉 backdrop-filter')
