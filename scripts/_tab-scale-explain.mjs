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
console.log('面板 296×744, radius 20 → safeBezel 19')
console.log('  厚度100 → scale', (maxDisp(100, 19) * 0.8).toFixed(1), 'px')
console.log('把手 30×77, radius 11 → safeBezel 10')
for (const thickness of [100, 10, 4, 2, 1]) {
  console.log(`  厚度${thickness} → scale ${(maxDisp(thickness, 10) * 0.8).toFixed(1)} px  (按钮宽 30px)`)
}
