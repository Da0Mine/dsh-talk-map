import fs from 'node:fs'
// 1) .panel 定位 + tab 玻璃底色
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!/\.panel \{[^}]*position: relative/s.test(t)) {
    t = t.replace('/* ==== glass fixes ==== */', `/* ==== glass fixes ==== */
/* Anchors the floating header: without this it resolves against the shell and jumps over
   the host's own top bar. */
.panel {
  position: relative;
}
`)
    // 删掉重复的透明块（保留一条）
    t = t.replace(/(\/\* ==== glass fixes ==== \*\/[\s\S]*?\.panel \{\s*position: relative;\s*\}\n)([\s\S]*?)\n\.panel \{\s*background: transparent;\s*\}/, '$1$2\n.panel {\n  background: transparent;\n}')
  }
  // tab 半透明，让折射透出来
  t = t.replace(/\.statusRailTab \{[^}]*\}/, (block) => block.replace(/background:[^;]*;/, 'background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 52%, transparent);'))
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: .panel 定位 + tab 底色')
}
// 2) StatusRail：给 tab 挂折射
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('tabRef')) {
    t = t.replace(
      '  const panelRef = useRef<HTMLDivElement | null>(null)',
      `  const panelRef = useRef<HTMLDivElement | null>(null)
  const tabRef = useRef<HTMLButtonElement | null>(null)`,
    )
    // 在 panel 的玻璃 effect 之后追加 tab effect
    const anchor = `  }, [])

  // Cards`
    const tabEffect = `  }, [])

  // The handle that opens the rail is glass too.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element, { radius: 14, bezel: 14, thickness: 44, ior: 2.2, scale: 8, specular: 0.26 })
  }, [])

  // Cards`
    if (t.includes(anchor)) t = t.replace(anchor, tabEffect)
    t = t.replace("      className={styles['statusRailTab']}", "      ref={tabRef}\n      className={styles['statusRailTab']}")
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: tab 折射已接')
}
