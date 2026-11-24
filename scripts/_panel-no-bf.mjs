import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = `  // Real refraction on the panel: the backdrop is bent along the bezel by an SVG
  // displacement filter (ported from EchoMusic's echo-liquid-glass).
  useEffect(() => {
    const element = panelRef.current
    if (element === null) return undefined
    // Plugin defaults are thickness 100 / bezel 40 / ior 2.5 / specular 0.5. Widened here:
    // a thicker slab and a 60px bezel push the bent band further into the surface.
    return installLiquidGlass(element, { thickness: 160, bezelWidth: 60, ior: 2.6, specularOpacity: 0.6, scale: 96 })
  }, [])`
const after = `  // No backdrop filter on the panel itself. Beyond never rendering here, it establishes a
  // backdrop root, which makes every child's backdrop-filter blur only the (empty) panel content
  // instead of the canvas behind — that is why the card blur looked like it did nothing.
  // The panel keeps its CSS rim + inner glow instead.`
if (!t.includes(before)) throw new Error('panel glass anchor missing')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('面板滤镜移除，卡片的 backdrop-filter 才有效')
