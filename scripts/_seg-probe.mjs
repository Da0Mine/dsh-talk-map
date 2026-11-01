import { routeBetween, __routeDebug, __hitsH, __hitsV } from '../src/client/edge-route.ts'
const W = 224, H = 120, GX = 24, GY = 32, margin = 4
const cards = []
for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) cards.push({ id: `c${r}_${c}`, x: c * (W + GX), y: r * (H + GY), w: W, h: H })
const from = cards.find(c => c.id === 'c1_0'), to = cards.find(c => c.id === 'c1_2')
const others = cards.filter(c => c !== from && c !== to)
const blocked = others.map(c => ({ x: c.x - margin, y: c.y - margin, w: c.w + 2 * margin, h: c.h + 2 * margin }))
console.log('blocked count', blocked.length)
console.log('H 136 from 230→490 =', __hitsH(blocked, 136, 230, 490))
console.log('V 230 212→136    =', __hitsV(blocked, 230, 212, 136))
console.log('V 490 136→212    =', __hitsV(blocked, 490, 136, 212))
console.log('H 212 230→490    =', __hitsH(blocked, 212, 230, 490))
// who is hit on y=136?
for (const rect of blocked) { if (!(136 <= rect.y || 136 >= rect.y + rect.h)) console.log('  y=136 inside rect', JSON.stringify(rect)) }
