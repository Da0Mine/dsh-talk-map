import { routeBetween, __routeDebug } from '../src/client/edge-route.ts'
const W = 224, H = 120
const cards = []
for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) cards.push({ id: `c${r}_${c}`, x: c * (W + 24), y: r * (H + 32), w: W, h: H })
const from = cards.find(c => c.id === 'c1_0'), to = cards.find(c => c.id === 'c1_2')
const others = cards.filter(c => c !== from && c !== to)
const anchor = (b, f) => f === 'r' ? { x: b.x + b.w, y: b.y + b.h / 2 } : f === 'l' ? { x: b.x, y: b.y + b.h / 2 } : f === 't' ? { x: b.x + b.w / 2, y: b.y } : { x: b.x + b.w / 2, y: b.y + b.h }
const pts = routeBetween({ start: anchor(from, 'r'), startFace: 'r', end: anchor(to, 'l'), endFace: 'l' }, from, to, others.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h })))
console.log('points', JSON.stringify(pts))
console.log('lanes', JSON.stringify(__routeDebug.lanes))
// is the Z through the row gap clean?
const z = [anchor(from,'r'), { x: 230, y: 212 }, { x: 230, y: 136 }, { x: 490, y: 136 }, { x: 490, y: 212 }, anchor(to,'l')]
const hit = (a, b) => { let n = 0; const steps = Math.max(2, Math.ceil((Math.abs(b.x-a.x)+Math.abs(b.y-a.y))/2)); for (let s=0;s<=steps;s++){const t=s/steps;const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}; for(const c of others){ if(p.x>c.x+0.5&&p.x<c.x+c.w-0.5&&p.y>c.y+0.5&&p.y<c.y+c.h-0.5) n++ }} return n }
let zHit = 0
for (let i=1;i<z.length;i++) zHit += hit(z[i-1], z[i])
console.log('hand-built Z hits:', zHit)
