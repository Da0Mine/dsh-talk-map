import { routeEdge, __routeDebug } from '../src/client/edge-route.ts'
const W = 224, H = 120
const r = (x, y, id) => ({ id, x, y, w: W, h: H })
// 复刻用户截图：S 在左，M 在右上（遮挡），T 在 M 正下方
const S = r(0, 0, 'S'), M = r(272, 0, 'M'), T = r(272, 176, 'T')
const obstacles = [S, M, T]
const pts = routeEdge(S, T, 'r', 't', obstacles)
const others = [M]
const dist = (p, rect) => Math.hypot(Math.max(rect.x - p.x, 0, p.x - (rect.x + rect.w)), Math.max(rect.y - p.y, 0, p.y - (rect.y + rect.h)))
let worst = Infinity, inside = 0
for (let i = 1; i < pts.length; i++) {
  const a = pts[i-1], b = pts[i]
  const steps = Math.max(4, Math.ceil((Math.abs(b.x-a.x)+Math.abs(b.y-a.y))/2))
  for (let s2 = 0; s2 <= steps; s2++) {
    const t = s2/steps, p = { x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t }
    for (const c of others) { const d = dist(p, c); if (d < worst) worst = d; if (d === 0) inside++ }
  }
}
console.log(JSON.stringify({ debug: __routeDebug.last, points: pts, closestToBlocker: Math.round(worst*10)/10, insideBlocker: inside }))