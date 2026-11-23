import fs from 'node:fs'
const f = 'src/client/MapOverlay.tsx'
let t = fs.readFileSync(f, 'utf8')
// useRef 导入
t = t.replace("import { useEffect, useSyncExternalStore } from 'react'", "import { useEffect, useRef, useSyncExternalStore } from 'react'")
// ref + 安装折射与光效
if (!t.includes('headerRef = useRef')) {
  t = t.replace(
    "  const fontStep = useSyncExternalStore(fontScale.subscribe, fontScale.getSnapshot)",
    `  const fontStep = useSyncExternalStore(fontScale.subscribe, fontScale.getSnapshot)

  // Top bar of the map: same liquid glass as the rail (refraction + HarmonyOS glow).
  const headerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const element = headerRef.current
    if (element === null) return undefined
    const disposeGlass = installLiquidGlass(element, { radius: 16, bezel: 18, thickness: 60, ior: 2.3, scale: 34, specular: 0.34 })
    const disposeGlow = installGlow(element, { radius: 220, borderRadius: 150 })
    return () => {
      disposeGlass()
      disposeGlow()
    }
  }, [])`,
  )
}
fs.writeFileSync(f, t, 'utf8')
console.log('MapOverlay: 顶部条折射 + 光效已接')
