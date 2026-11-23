import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
const head = execFileSync('git', ['show', 'HEAD:src/client/SidebarQueue.tsx']).toString()
fs.writeFileSync('src/client/SidebarQueue.tsx', head, 'utf8')
console.log('SidebarQueue.tsx 已还原到 HEAD（撤回未验证的侧栏缓存改动）')
