function squircle(t){ return Math.pow(1 - Math.pow(1 - t, 4), 0.25) }
function maxDisp(thickness, bezel, ior = 2.5, samples = 128) {
  const eta = 1 / ior, out = new Float64Array(samples)
  for (let i = 0; i < samples; i += 1) {
    const x = i / samples, y = squircle(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const deriv = (squircle(x + dx) - y) / dx
    const mag = Math.sqrt(deriv * deriv + 1)
    const nx = -deriv / mag, ny = -1 / mag
    const k = 1 - eta * eta * (1 - ny * ny)
    if (k < 0) continue
    const sq = Math.sqrt(k)
    const rx = -(eta * ny + sq) * nx, ry = eta - (eta * ny + sq) * ny
    out[i] = ry === 0 ? 0 : rx * ((y * bezel + thickness) / ry)
  }
  return Math.max(...Array.from(out).map(Math.abs))
}
const panel = { w: 296, h: 744, r: 20 }
const tab = { w: 30, h: 77, r: 11 }
for (const [name, g] of [['面板', panel], ['按钮', tab]]) {
  const safeBezel = Math.min(40, g.r - 1, Math.min(g.w, g.h) / 2 - 1)
  const md = maxDisp(100, safeBezel)
  const scale = Math.min(md * 0.8, Math.min(g.w, g.h) * 0.25)
  console.log(`${name}: safeBezel=${safeBezel.toFixed(0)}  高光带宽=${(safeBezel*2.5).toFixed(0)}px  maxDisp=${md.toFixed(0)}  scale=${scale.toFixed(1)}px`)
}
