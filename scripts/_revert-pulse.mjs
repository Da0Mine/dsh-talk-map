import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const start = t.indexOf('/* Running cards breathe too:')
if (start < 0) throw new Error('pulse block missing')
t = t.slice(0, start).trimEnd() + '\n'
fs.writeFileSync(f, t, 'utf8')
console.log('撤掉运行卡脉冲（probe 明确要求"运行中不呼吸"，且用户此前嫌白边乱晃）')
