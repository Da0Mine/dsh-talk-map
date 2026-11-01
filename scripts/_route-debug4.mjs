import { routeBetween, __routeDebug } from '../src/client/edge-route.ts'
const W = 224, H = 120
const rect = (x, y) => ({ x, y, w: W, h: H })
const a = rect(40, 30), b = rect(520, 210), blk = rect(296, 96)
const others = [blk]                       // the app passes every *other* card
const ends = { start: { x: 264, y: 90 }, startFace: 'r', end: { x: 520, y: 270 }, endFace: 'l' }
const pts = routeBetween(ends, a, b, others)
console.log('debug:', JSON.stringify(__routeDebug))
console.log('points:', JSON.stringify(pts))