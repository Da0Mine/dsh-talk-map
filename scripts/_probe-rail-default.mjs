import fs from 'node:fs'
const f = 'test/probe.mjs'
let t = fs.readFileSync(f, 'utf8')

// 1) 画布类检查按“侧栏收起”跑：0.4.5 起默认展开，会盖住左侧画布
t = t.replace(
  `    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('dsh.talk-map.')) localStorage.removeItem(key)
    }
  })`,
  `    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('dsh.talk-map.')) localStorage.removeItem(key)
    }
    // The rail now defaults to open (0.4.5). Most checks drive the canvas under it, so this
    // run starts with it closed; the default-open behaviour has its own check further down.
    localStorage.setItem('dsh.talk-map.status-rail.open.v1', '0')
  })`,
)

// 2) 新增：默认展开的检查（清掉记录 → 重载 → 应展开）
t = t.replace(
  `  // ---- 0b. header: font size controls, no language switch ----------------`,
  `  // ---- 0a2. the queue rail keeps its board even with nothing to show --------
  {
    const railDefault = await page.evaluate(async () => {
      localStorage.removeItem('dsh.talk-map.status-rail.open.v1')
      return true
    })
    if (railDefault) {
      await page.reload()
      await page.waitForSelector('.react-flow__node', { timeout: 10000 })
      await page.waitForTimeout(700)
    }
    const state = await page.evaluate(() => {
      const rail = document.querySelector('[class*="statusRail"]')
      const panel = document.querySelector('[class*="statusRailPanel"]')
      return {
        dataOpen: rail === null ? null : rail.getAttribute('data-open'),
        panelX: panel === null ? null : Math.round(panel.getBoundingClientRect().x),
        title: document.querySelector('[class*="statusRailTitle"]')?.textContent ?? null,
      }
    })
    check('无展开记录时侧栏默认展开', state.dataOpen === '1' && state.panelX === 0, JSON.stringify(state))
    check('侧栏标题常驻', state.title === '队列中的任务', String(state.title))
    await page.evaluate(() => { localStorage.setItem('dsh.talk-map.status-rail.open.v1', '0') })
    await page.reload()
    await page.waitForSelector('.react-flow__node', { timeout: 10000 })
    await page.waitForTimeout(700)
  }

  // ---- 0b. header: font size controls, no language switch ----------------`,
)

fs.writeFileSync(f, t, 'utf8')
console.log('probe: 画布类检查用收起态 + 新增默认展开检查')
