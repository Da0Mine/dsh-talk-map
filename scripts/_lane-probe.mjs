import { routeBetween, __routeDebug } from '../src/client/edge-route.ts'
import * as mod from '../src/client/edge-route.ts'
const W = 224, H = 120, GX = 24, GY = 32
const cards = []
for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) cards.push({ id: `c${r}_${c}`, x: c * (W + GX), y: r * (H + GY), w: W, h: H })
const from = cards.find(c => c.id === 'c1_0'), to = cards.find(c => c.id === 'c1_2')
const others = cards.filter(c => c !== from && c !== to)
const anchor = (b, f) => f === 'r' ? { x: b.x + b.w, y: b.y + b.h / 2 } : f === 'l' ? { x: b.x, y: b.y + b.h / 2 } : f === 't' ? { x: b.x + b.w / 2, y: b.y } : { x: b.x + b.w / 2, y: b.y + b.h }
const pts = routeBetween({ start: anchor(from, 'r'), startFace: 'r', end: anchor(to, 'l'), endFace: 'l' }, from, to, others.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h })))
console.log('points', JSON.stringify(pts))
console.log('keys', Object.keys(__routeDebug).join(',')); console.log('lanes used:', JSON.stringify(__routeDebug.lanes)); console.log('cands:', JSON.stringify((__routeDebug.candLog ?? []).slice(0, 8)))
console.log('corridorsY', JSON.stringify(mod.corridors(others.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h })), 'y', 10).slice(0, 8)))
console.log('corridorsX', JSON.stringify(mod.corridors(others.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h })), 'x', 10).slice(0, 8)))
