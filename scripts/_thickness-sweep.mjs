function squircle(t){ return Math.pow(1 - Math.pow(1 - t, 4), 0.25) }
function maxDispFor(thickness, bezelWidth, ior = 2.5, samples = 128) {
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
    out[i] = ry === 0 ? 0 : rx * ((y * bezelWidth + thickness) / ry)
  }
  return Math.max(...Array.from(out).map(Math.abs))
}
for (const thickness of [100, 60, 40, 30, 24, 18, 14, 10]) {
  const md = maxDispFor(thickness, 40)
  console.log(`thickness=${thickness} → maxDisp=${md.toFixed(1)} scale=${(md*0.8).toFixed(1)}px`)
}
