import fs from 'node:fs'
const f = 'scripts/_flip-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  const samples = []
  for (const wait of [0, 16, 32, 60, 140, 260]) {
    if (wait > 0) await page.waitForTimeout(wait === 16 ? 16 : wait - samples.at(-1).wait)
    const g = await geoms()
    samples.push({ wait, top: g[0]?.top ?? null })
  }`,
  `  const samples = []
  const start = Date.now()
  while (Date.now() - start < 320) {
    const g = await page.evaluate(() => {
      const head = document.querySelector('[class*="statusRailRecentHead"]')
      const list = head.parentElement
      const slots = [...list.children].slice([...list.children].indexOf(head) + 1)
      const hit = slots.find(slot => (slot.textContent ?? '').startsWith('医学影像'))
      return hit === undefined ? null : Math.round(hit.getBoundingClientRect().top)
    })
    samples.push({ ms: Date.now() - start, top: g })
    await page.waitForTimeout(12)
  }`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('改为按标题跟踪同一张卡')
