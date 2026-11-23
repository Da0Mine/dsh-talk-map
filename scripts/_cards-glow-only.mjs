import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = `        const disposeGlass = installLiquidGlass(element, { radius: 16, bezel: 14, thickness: 46, ior: 2.2, scale: 22, specular: 0.3 })
        const disposeGlow = installGlow(element, { radius: 130, borderRadius: 90 })
        installed.set(element, () => {
          disposeGlass()
          disposeGlow()
        })`
const after = `        // Cards keep the glow but no displacement filter: they sit on an already-refracted
        // panel, and one extra SVG filter per card cost 33 ms per frame here (median 17 -> 50).
        const disposeGlow = installGlow(element, { radius: 130, borderRadius: 90 })
        installed.set(element, disposeGlow)`
if (!t.includes(before)) throw new Error('card decorate anchor missing')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('卡片去掉折射，仅保光效')
