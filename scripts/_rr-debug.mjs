import { routeBetween, __routeDebug } from '../src/client/edge-route.ts'
const A = { x: 0, y: 0, w: 224, h: 120 }
const B = { x: 272, y: 0, w: 224, h: 120 }
const anchor = (c, f) => f === 'r' ? { x: c.x + c.w, y: c.y + c.h / 2 } : { x: c.x, y: c.y + c.h / 2 }
const pts = routeBetween({ start: anchor(A, 'r'), startFace: 'r', end: anchor(B, 'r'), endFace: 'r' }, A, B, [])
console.log('pts', JSON.stringify(pts))
console.log('dbg', JSON.stringify(__routeDebug).slice(0, 500))
