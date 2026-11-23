import fs from 'node:fs'
// 拖动时把 SVG 折射换成同色调的模糊（静止仍是真折射）
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('data-frozen')) {
    t += `
/* Panning: the displacement filter re-samples the canvas every frame (~16 ms here). Keep the
   exact same tint and rim, and swap only the filter for a cheap blur — the change is invisible
   at speed, and the settle is instant because nothing else moves. */
.statusRail[data-frozen="1"] .statusRailPanel,
.statusRail[data-frozen="1"] .statusRailTab {
  backdrop-filter: blur(6px) saturate(1.7) !important;
  -webkit-backdrop-filter: blur(6px) saturate(1.7) !important;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: frozen 降级已加')
  }
}
// 把冻结状态放回 rail（轻量 store，避免画布重渲染）
{
  const store = 'src/client/rail-frozen.ts'
  if (!fs.existsSync(store)) {
    fs.writeFileSync(store, `/** "Canvas is moving" — the rail swaps its refraction filter for a cheap blur. */
let frozen = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function publish(next: boolean): void {
  if (frozen === next) return
  frozen = next
  for (const listener of listeners) listener()
}

export const railFrozen = {
  isFrozen(): boolean {
    return frozen
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  freeze(): void {
    if (timer !== undefined) { clearTimeout(timer); timer = undefined }
    publish(true)
  },
  thaw(delayMs = 120): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => { timer = undefined; publish(false) }, delayMs)
  },
}
`, 'utf8')
    console.log('rail-frozen.ts 已建')
  }
}
// MapCanvas: move 事件驱动它
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('railFrozen')) {
    const anchor = "        onMoveEnd={(_event, viewport: Viewport) => {"
    t = t.replace(anchor, "        onMoveStart={() => { railFrozen.freeze() }}\n" + anchor + "\n          railFrozen.thaw()")
    const importAt = t.split('\n').find(line => line.startsWith('import '))
    t = t.replace(importAt, importAt + "\nimport { railFrozen } from './rail-frozen.ts'")
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 冻结已接')
}
// StatusRail: 把状态写到 data-frozen
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('railFrozen')) {
    t = t.replace(
      '  const open = useSyncExternalStore(subscribeOpen, openSnapshot, openSnapshot)',
      '  const open = useSyncExternalStore(subscribeOpen, openSnapshot, openSnapshot)\n  const frozen = useSyncExternalStore(railFrozen.subscribe, railFrozen.isFrozen)',
    )
    t = t.replace("      data-open={open ? '1' : '0'}", "      data-open={open ? '1' : '0'}\n      data-frozen={frozen ? '1' : '0'}")
    const importAt = t.split('\n').find(line => line.startsWith('import '))
    t = t.replace(importAt, importAt + "\nimport { railFrozen } from './rail-frozen.ts'")
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: data-frozen 已接')
}
