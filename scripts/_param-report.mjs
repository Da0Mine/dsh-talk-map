function squircle(t){ return Math.pow(1 - Math.pow(1 - t, 4), 0.25) }
function profile(thickness, bezelWidth, ior, samples = 128) {
  const eta = 1 / ior
  const out = new Float64Array(samples)
  for (let i = 0; i < samples; i += 1) {
    const x = i / samples
    const y = squircle(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const deriv = (squircle(x + dx) - y) / dx
    const mag = Math.sqrt(deriv * deriv + 1)
    const nx = -deriv / mag, ny = -1 / mag
    const k = 1 - eta * eta * (1 - ny * ny)
    if (k < 0) { out[i] = 0; continue }
    const sq = Math.sqrt(k)
    const rx = -(eta * ny + sq) * nx
    const ry = eta - (eta * ny + sq) * ny
    out[i] = ry === 0 ? 0 : rx * ((y * bezelWidth + thickness) / ry)
  }
  return out
}
for (const [label, w, h, radius] of [['面板', 296, 744, 20], ['把手', 30, 77, 11]]) {
  const safeBezel = Math.min(40, radius - 1, Math.min(w, h) / 2 - 1)
  const p = profile(100, safeBezel, 2.5)
  const maxDisp = Math.max(...Array.from(p).map(Math.abs))
  console.log(`${label}: w=${w} h=${h} radius=${radius} → safeBezel=${safeBezel.toFixed(1)}  maxDisp=${maxDisp.toFixed(3)}  scale=${(maxDisp*0.8).toFixed(2)}px`)
}
