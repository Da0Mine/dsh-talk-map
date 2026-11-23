import fs from 'node:fs'
const f = 'test/harness.js'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('lastUserCalls')) {
  // 计数器
  t = t.replace('const posts = []', 'const posts = []\n  /** last-user 拨测计数（本文件是测试桩，不属于产品代码）。 */\n  const lastUserCalls = { calls: 0, ids: 0 }')
  // 在 last-user 桩里累加
  t = t.replace(
    "        if (path.indexOf('/talk-map/last-user') >= 0) {\n          const texts = {}",
    "        if (path.indexOf('/talk-map/last-user') >= 0) {\n          lastUserCalls.calls += 1\n          lastUserCalls.ids += (body?.sessionIds ?? []).length\n          const texts = {}",
  )
  // 导出
  t = t.replace('    posts,', '    posts,\n    lastUserCalls: () => ({ ...lastUserCalls }),')
  fs.writeFileSync(f, t, 'utf8')
  console.log('harness: lastUserCalls 计数已加')
}
