import fs from 'node:fs'
// 1) liquid-glass：scale 按元素尺寸钳制
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('scaleCeiling')) {
    t = t.replace(
      '    const scale = maxDisp * 0.8',
      `    // The plugin computes scale = maxDisp * 0.8, an ABSOLUTE pixel value that is fine on its
    // wide player bar but swallows small elements whole (183 px on a 30 px handle leaves no
    // backdrop inside the element to sample). Clamp it to a quarter of the short side.
    const scaleCeiling = Math.min(width, height) * 0.25
    const scale = Math.min(maxDisp * 0.8, scaleCeiling)`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('liquid-glass: scale 钳制到短边的 25%')
  }
}
// 2) StatusRail：按钮重新挂滤镜
{
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
    t = t.replace(anchor, `${anchor}

  // Same material as the panel; the specular band is narrower because the handle is 30px wide.
  useEffect(() => {
    if (open) return undefined
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element, { specularBezel: 6 })
  }, [open])`)
    t = t.replace("      className={styles['statusRailTab']}", "      ref={tabRef}\n      className={styles['statusRailTab']}")
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 按钮挂回滤镜')
}
// 3) CSS：按钮对齐面板那条材质（透明底 + 同边框 token + 外投影）
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  const at = t.indexOf('/* Handle: same material as the panel, painted directly.')
  if (at >= 0) t = t.slice(0, at)
  t += `/* Handle: the panel's recipe, line for line — transparent fill, the same border token and
   the same drop shadow. Only the radius differs, because the displacement map needs the corner
   radius to stay below half the width (30px wide → 11px). */
.statusRailTab {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-secondary);
  border-left: none;
  box-shadow: 6px 0 26px rgba(0, 0, 0, 0.32);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 按钮对齐面板材质')
}
