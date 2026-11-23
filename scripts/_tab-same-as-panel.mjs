import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('tabRef')) {
  t = t.replace(
    '  const panelRef = useRef<HTMLDivElement | null>(null)',
    `  const panelRef = useRef<HTMLDivElement | null>(null)
  const tabRef = useRef<HTMLButtonElement | null>(null)`,
  )
  const anchor = `    return installLiquidGlass(element)
  }, [])`
  if (!t.includes(anchor)) throw new Error('panel effect anchor missing')
  t = t.replace(anchor, `${anchor}

  // The handle runs the plugin's own recipe with the panel's values — no blur, no fill.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element)
  }, [])`)
  t = t.replace("      className={styles['statusRailTab']}", "      ref={tabRef}\n      className={styles['statusRailTab']}")
}
fs.writeFileSync(f, t, 'utf8')
console.log('按钮：与面板同一套参数（无 blur）')
