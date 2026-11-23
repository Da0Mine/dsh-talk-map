import fs from 'node:fs'
// 1) StatusRail: 装上折射
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('installLiquidGlass')) {
    const importAt = t.split('\n').find(line => line.includes("from './draft-watch.ts'") || line.includes("from './api.ts'")) ?? t.split('\n').find(line => line.startsWith('import '))
    t = t.replace(importAt, importAt + "\nimport { installLiquidGlass } from './liquid-glass.ts'")
    // 组件内：紧跟 open 的订阅之后
    const hook = '  const open = useSyncExternalStore(subscribeOpen'
    const idx = t.indexOf(hook)
    if (idx < 0) throw new Error('open hook missing')
    const lineEnd = t.indexOf('\n', idx) + 1
    t = t.slice(0, lineEnd) + `
  // Real refraction on the panel: the backdrop is bent along the bezel by an SVG
  // displacement filter (ported from EchoMusic's echo-liquid-glass).
  useEffect(() => {
    const element = panelRef.current
    if (element === null) return undefined
    return installLiquidGlass(element, { radius: 22, bezel: 26, thickness: 90, ior: 2.4, scale: 58, specular: 0.42 })
  }, [])
` + t.slice(lineEnd)
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 折射已接上')
}
// 2) CSS：让面板足够透明、圆角与贴图一致
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('liquid glass (refraction)')) {
    t += `
/* ==== liquid glass (refraction) ==== */
/* The bent backdrop supplies the material; the fill only keeps text legible. */
.statusRailPanel {
  background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 44%, transparent);
  border-right: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0 22px 22px 0;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 0 22px rgba(255, 255, 255, 0.05),
    10px 0 34px rgba(0, 0, 0, 0.34);
}

.statusRailPanel .card {
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 62%, transparent);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 2px 10px rgba(0, 0, 0, 0.2);
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 面板透明度与圆角已调')
  }
}
