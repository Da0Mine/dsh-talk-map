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

  // The handle carries the same glass as the panel — the panel's material extended, not a
  // separate chip. Specular is off: on a 30px wide element that map washes the whole face.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element, { specularOpacity: 0 })
  }, [])`)
  t = t.replace("      className={styles['statusRailTab']}", "      ref={tabRef}\n      className={styles['statusRailTab']}")
}
fs.writeFileSync(f, t, 'utf8')
console.log('把手：同款折射，specular 关闭')
