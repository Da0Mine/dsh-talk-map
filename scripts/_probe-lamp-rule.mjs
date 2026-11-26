import fs from 'node:fs'
const f = 'test/probe.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  // The mark exists for completions that happen BEHIND the map. If you were
  // watching the conversation itself, you already saw it — no lamp.`,
  `  // A turn that ends anywhere becomes 待查看 until the conversation is opened: the sidebar queue
  // observes the status store even while the map is closed, so a completion behind the map counts
  // too. (The one exception is the conversation on screen — real clients report retainedBy.mainView
  // and the observer skips it; the harness has no such field, so this asserts the lamp.)`,
)
t = t.replace(
  `  check('关着地图时跑完 → 不亮「待查看」', closedFinish !== 'done',
    String(quietSession) + ' → ' + String(closedFinish))`,
  `  check('关着地图时跑完 → 打开后仍是「待查看」', closedFinish === 'done',
    String(quietSession) + ' → ' + String(closedFinish))`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('probe: 该检查改为断言新规则')
