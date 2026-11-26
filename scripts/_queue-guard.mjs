import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('queueRank')) {
  t = t.replace(`import { sortQueueRows } from './queue-order.ts'`, `import { queueRank, sortQueueRows } from './queue-order.ts'`)
}
if (!t.includes('useCallback')) {
  t = t.replace(`import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'`,
    `import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'`)
}
// 点击守卫：主行与最近行都不该在拖拽后触发跳转
t = t.replace(`              onClick={() => {`, `              onClick={() => {
                if (queueDrag.shouldIgnoreClick()) return`)
t = t.replace(`                  onClick={() => {`, `                  onClick={() => {
                    if (recentDrag.shouldIgnoreClick()) return`)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: imports + 点击守卫')
