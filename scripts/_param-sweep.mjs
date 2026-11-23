function squircle(t){ return Math.pow(1 - Math.pow(1 - t, 4), 0.25) }
function profile(thickness, bezelWidth, ior, samples = 128) {
  const eta = 1 / ior
  const out = new Float64Array(samples)
  for (let i = 0; i < samples; i += 1) {
    const x = i / samples, y = squircle(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const deriv = (squircle(x + dx) - y) / dx
    const mag = Math.sqrt(deriv * deriv + 1)
    const nx = -deriv / mag, ny = -1 / mag
    const k = 1 - eta * eta * (1 - ny * ny)
    if (k < 0) { out[i] = 0; continue }
    const sq = Math.sqrt(k)
    const rx = -(eta * ny + sq) * nx, ry = eta - (eta * ny + sq) * ny
    out[i] = ry === 0 ? 0 : rx * ((y * bezelWidth + thickness) / ry)
  }
  return out
}
for (const radius of [20, 28, 41, 60]) {
  const safe = Math.min(40, radius - 1, 148)
  const p = profile(100, safe, 2.5)
  const maxDisp = Math.max(...Array.from(p).map(Math.abs))
  console.log(`radius=${radius} → safeBezel=${safe} maxDisp=${maxDisp.toFixed(2)} scale=${(maxDisp*0.8).toFixed(1)}px`)
}
