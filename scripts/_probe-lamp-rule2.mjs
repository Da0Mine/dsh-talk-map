import fs from 'node:fs'
const f = 'test/probe.mjs'
const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
const idx = lines.findIndex(line => line.includes("关着地图时跑完 → 不亮「待查看」"))
if (idx < 0) throw new Error('check line not found')
lines[idx] = "  check('关着地图时跑完 → 打开后仍是「待查看」', closedFinish === 'done',"
// 顺带把上面那段注释改成新规则
const commentAt = lines.findIndex(line => line.includes('watching the conversation itself, you already saw it'))
if (commentAt >= 0) lines[commentAt] = '  // The sidebar queue observes the status store even while the map is closed, so a turn that'
if (commentAt >= 0) lines.splice(commentAt + 1, 0, '  // ends behind the map still becomes 待查看 until that conversation is opened.')
fs.writeFileSync(f, lines.join('\n'), 'utf8')
console.log('probe: 已改到第', idx + 1, '行')
