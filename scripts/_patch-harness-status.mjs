import fs from 'node:fs'
const file = 'test/harness.js'
let t = fs.readFileSync(file, 'utf8')
// ctx.uiSession.sessionStatus：和 useSessionStatus 读同一张 statusById 表
if (!t.includes('sessionStatus:')) {
  t = t.replace(
    "    get(name) { return ctx[name] },",
    `    get(name) {
      // uiSession.sessionStatus is the store behind useSessionStatus; expose the same map so
      // the sidebar queue and the map rail agree in the offline harness too.
      if (name === 'uiSession') {
        return { sessionStatus: { getSnapshot: () => statusById, subscribe: () => () => {} } }
      }
      return ctx[name]
    },`,
  )
  fs.writeFileSync(file, t, 'utf8')
  console.log('harness: uiSession.sessionStatus stub added')
}
