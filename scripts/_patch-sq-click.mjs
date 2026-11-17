import fs from 'node:fs'
const file = 'scripts/_sidebar-queue-check2.mjs'
let t = fs.readFileSync(file, 'utf8')
if (!t.includes('ui.openSession')) {
  t = t.replace(
    "console.log(JSON.stringify(info, null, 1))",
    `console.log(JSON.stringify(info, null, 1))
if (info.cardCount > 0) {
  await page.evaluate(() => { window.__harness.log.length = 0 })
  await page.click('[data-talkmap-queue]')
  await page.waitForTimeout(600)
  const after = await page.evaluate(() => ({
    opened: window.__harness.log.filter(e => e.kind === 'ui.openSession').length,
    session: window.__harness.log.filter(e => e.kind === 'ui.openSession').at(-1)?.sessionId ?? null,
    mapClosed: window.__harness.panelState?.().open ?? null,
  }))
  console.log('点击侧栏卡片:', JSON.stringify(after))
}`,
  )
}
fs.writeFileSync(file, t, 'utf8')
console.log('click assertion added')
