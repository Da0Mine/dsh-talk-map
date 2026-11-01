import { routeBetween, __routeDebug, __hitsH } from '../src/client/edge-route.ts'
const W = 224, H = 120
const cards = []
for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) cards.push({ id: `c${r}_${c}`, x: c * (W + 24), y: r * (H + 32), w: W, h: H })
const from = cards.find(c => c.id === 'c1_0'), to = cards.find(c => c.id === 'c1_2')
const others = cards.filter(c => c !== from && c !== to)
const anchor = (b, f) => f === 'r' ? { x: b.x + b.w, y: b.y + b.h / 2 } : f === 'l' ? { x: b.x, y: b.y + b.h / 2 } : f === 't' ? { x: b.x + b.w / 2, y: b.y } : { x: b.x + b.w / 2, y: b.y + b.h }
const pts = routeBetween({ start: anchor(from, 'r'), startFace: 'r', end: anchor(to, 'l'), endFace: 'l' }, from, to, others.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h })))
console.log('raw', JSON.stringify(__routeDebug.rawPath))
console.log('hits 238→474 @212 =', __hitsH(__routeDebug.blockedFirst ? [{x:244,y:148,w:232,h:128}] : [], 212, 238, 474))
console.log('points', JSON.stringify(pts))
