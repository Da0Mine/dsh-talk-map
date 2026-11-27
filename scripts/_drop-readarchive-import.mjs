import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(`import { readArchive } from './read-archive.ts'\n`, '')
fs.writeFileSync(f, t, 'utf8')
console.log('MapCanvas: 去掉未用 import')
