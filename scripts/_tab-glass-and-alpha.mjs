import fs from 'node:fs'
// 1) StatusRail：把手也挂玻璃（同样默认参数）
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('tabRef')) {
    t = t.replace(
      '  const panelRef = useRef<HTMLDivElement | null>(null)',
      `  const panelRef = useRef<HTMLDivElement | null>(null)
  const tabRef = useRef<HTMLButtonElement | null>(null)`,
    )
    // 在面板 effect 之后插入 tab effect
    const marker = `    return installLiquidGlass(element)
  }, [])`
    if (!t.includes(marker)) throw new Error('panel effect anchor missing')
    t = t.replace(marker, `${marker}

  // The handle that opens the rail gets the same material.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element)
  }, [])`)
    t = t.replace("      className={styles['statusRailTab']}", "      ref={tabRef}\n      className={styles['statusRailTab']}")
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 把手挂玻璃')
}
// 2) 面板底透明度 50% -> 30%
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace('const bgOpacity = options.bgOpacity ?? 50', 'const bgOpacity = options.bgOpacity ?? 30')
  fs.writeFileSync(f, t, 'utf8')
  console.log('bgOpacity 50 → 30')
}
// 3) 把手需要圆角，否则折射不生效
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('.statusRailTab {')) {
    t += `
/* The refractive filter needs a non-zero corner radius on the handle too. */
.statusRailTab {
  border-radius: 14px;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 把手圆角 14px')
  }
}
