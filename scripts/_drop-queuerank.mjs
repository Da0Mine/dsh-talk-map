import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!/queueRank\(/.test(t)) {
  t = t.replace(`import { queueRank, sortQueueRows } from './queue-order.ts'`, `import { sortQueueRows } from './queue-order.ts'`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('去掉未用的 queueRank import')
}
