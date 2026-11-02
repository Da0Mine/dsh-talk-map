import { routeBetween } from '../src/client/edge-route.ts'
const A = { x: 0, y: 0, w: 224, h: 120 }
const B = { x: 272, y: 0, w: 224, h: 120 }
const anchor = (c, f) => f === 'r' ? { x: c.x + c.w, y: c.y + c.h / 2 } : f === 'l' ? { x: c.x, y: c.y + c.h / 2 } : f === 't' ? { x: c.x + c.w / 2, y: c.y } : { x: c.x + c.w / 2, y: c.y + c.h }
for (const pair of [['r','r'],['l','l'],['t','t'],['b','b'],['r','l'],['b','t']]) {
  const pts = routeBetween({ start: anchor(A, pair[0]), startFace: pair[0], end: anchor(B, pair[1]), endFace: pair[1] }, A, B, [])
  console.log(pair.join('→'), JSON.stringify(pts))
}
