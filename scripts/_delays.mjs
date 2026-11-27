import fs from 'node:fs'

// 1) 地图侧：滴灌也在 5 秒后才开始
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('previewDripAllowed')) {
    t = t.replace(
      `  const lastPreviewAt = useRef<Map<string, number>>(new Map())`,
      `  /** The periodic drip also waits: its reads would compete with the initial hydration. */
  const previewDripAllowed = useRef(false)
  const lastPreviewAt = useRef<Map<string, number>>(new Map())`,
    )
    t = t.replace(
      `    previewTick.current = tick
    tick()
    const timer = setInterval(tick, PREVIEW_INTERVAL_MS)`,
      `    previewTick.current = tick
    setTimeout(() => { previewDripAllowed.current = true }, PREVIEW_WARM_DELAY_MS)
    const timer = setInterval(tick, PREVIEW_INTERVAL_MS)`,
    )
    t = t.replace(
      `    const tick = (): void => {`,
      `    const tick = (): void => {
      if (!previewDripAllowed.current) return`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('MapCanvas: 滴灌延迟')
  }
}

// 2) 外侧栏：首次请求也等 5 秒，一次 3 张
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(`const PREVIEW_PAGE = 5`, `const PREVIEW_PAGE = 3
/** Wait for the shell to hydrate titles before spending surface reads. */
const PREVIEW_START_DELAY_MS = 5000`)
  if (!t.includes('previewAllowedRef')) {
    t = t.replace(
      `  const askedRef = useRef<Map<string, number>>(new Map())`,
      `  const askedRef = useRef<Map<string, number>>(new Map())
  const previewAllowedRef = useRef(false)`,
    )
    t = t.replace(
      `  useEffect(() => {
    // Queue rows and recent rows get their own budgets`,
      `  useEffect(() => {
    const timer = setTimeout(() => {
      previewAllowedRef.current = true
      setPreviews(current => ({ ...current }))
    }, PREVIEW_START_DELAY_MS)
    return () => { clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!previewAllowedRef.current) return
    // Queue rows and recent rows get their own budgets`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('SidebarQueue: 延迟 5s + 一次 3 张')
  }
}
