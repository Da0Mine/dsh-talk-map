import fs from 'node:fs'

// 1) MapCanvas：最近区最多给出 30 条（由侧栏分页显示）
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(`    return rows.slice(0, 3)`, `    // The rail paginates (5 at a time); it needs the whole window, not just the first three.
    return rows.slice(0, MAX_RECENT_TASKS)`)
  t = t.replace(
    `const recentEntries = useMemo<StatusRailEntry[]>(() => {`,
    `const recentEntries = useMemo<StatusRailEntry[]>(() => {`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 最近区上限改为常量')
}

// 常量放到 StatusRail 里导出，MapCanvas 引入
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('MAX_RECENT_TASKS')) {
    t = t.replace(
      `export type StatusLamp = CardGlow`,
      `/** How many finished-and-read tasks the plugin keeps around for「最近的任务」. */
export const MAX_RECENT_TASKS = 30
/** How many of them are on screen before「查看更多」. */
const RECENT_PAGE_SIZE = 5

export type StatusLamp = CardGlow`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('StatusRail: 常量')
  }
}

// MapCanvas 引入常量
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `import { StatusRail, type StatusRailEntry, type StatusLamp } from './StatusRail.tsx'`,
    `import { MAX_RECENT_TASKS, StatusRail, type StatusRailEntry, type StatusLamp } from './StatusRail.tsx'`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 引入常量')
}
