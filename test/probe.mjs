/**
 * Headless-Edge probe for the talk-map client bundle.
 *
 * Runs the real built artifact in a throwaway headless Edge (own --user-data-dir,
 * own debugging port) and asserts the behaviours this project cares about.
 * Never touches the user's browser profile.
 *
 *   node test/probe.mjs            # boots Edge + static server itself
 *   node test/probe.mjs --headed   # same, with a visible window
 *
 * Exit code 0 = every check passed; 1 = at least one FAIL (listed at the end).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))
const PORT = 8791
const CDP = 9333
const headed = process.argv.includes('--headed')
const profileDir = path.join(os.tmpdir(), 'talkmap-edge-profile')
const shots = path.join(ROOT, 'test/shots')

const results = []
function check(name, passed, detail) {
  results.push({ name, passed, detail })
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${detail}`}`)
}

// ---- static server ------------------------------------------------------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
}
const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`)
  const rel = decodeURIComponent(url.pathname === '/' ? '/test/index.html' : url.pathname)
  const file = path.join(ROOT, rel)
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
    response.writeHead(404).end('not found')
    return
  }
  response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
  response.end(fs.readFileSync(file))
})
await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve))

// ---- headless Edge ------------------------------------------------------
if (EDGE === undefined) throw new Error('Microsoft Edge not found')
fs.rmSync(profileDir, { recursive: true, force: true })
const edge = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-sync',
  '--window-size=1600,1000',
  ...(headed ? [] : ['--headless=new']),
  'about:blank',
], { stdio: 'ignore', detached: false })

async function waitForCdp(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP}/json/version`)
      if (response.ok) return await response.json()
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error('headless Edge did not expose CDP in time')
}

let browser
let failures = 0
try {
  const version = await waitForCdp()
  console.log(`Edge ${version.Browser} via CDP :${CDP}\n`)
  fs.mkdirSync(shots, { recursive: true })
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const context = browser.contexts()[0] ?? await browser.newContext()
  const page = context.pages()[0] ?? await context.newPage()
  const consoleErrors = []
  page.on('pageerror', error => consoleErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  const box = async (selector) => page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (el === null) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }, selector)
  const cardPoint = async (sessionId) => page.evaluate((sid) => {
    const state = window.__harness.state()
    const el = [...document.querySelectorAll('.react-flow__node')]
      .find(node => state.cards[node.getAttribute('data-id')]?.sessionId === sid)
    if (el === undefined || el === null) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + 40, y: r.y + 14 }
  }, sessionId)
  const menuItems = () => page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].map(el => el.textContent.trim()))
  const clickMenuItem = async (needle) => {
    await page.evaluate((text) => {
      const target = [...document.querySelectorAll('[role="menuitem"]')].find(el => el.textContent.includes(text))
      target?.click()
    }, needle)
    await page.waitForTimeout(500)
  }
  const openMap = async () => {
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
    await page.waitForTimeout(600)
  }

  await page.goto(`http://127.0.0.1:${PORT}/test/index.html`)
  await page.waitForSelector('.react-flow__node', { timeout: 10000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(shots, 'probe-initial.png') })

  // ---- 1. header -------------------------------------------------------
  const header = await page.evaluate(() => {
    const read = (el) => {
      if (el === null) return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height), text: el.textContent.trim() }
    }
    return {
      back: read(document.querySelector('[class*="tm_backButton"]')),
      close: read(document.querySelector('[class*="tm_closeButton"]')),
      title: document.querySelector('[class*="headerTitle"]') !== null,
      hotkey: document.querySelector('[class*="tm_hotkeyButton"]') !== null,
      fullscreen: document.querySelector('[class*="tm_fullscreenButton"]') !== null,
      topGap: (() => {
        const panel = document.querySelector('[class*="tm_panel"]')
        const head = document.querySelector('[class*="tm_header"]')
        if (panel === null || head === null) return null
        return Math.round(head.getBoundingClientRect().top - panel.getBoundingClientRect().top)
      })(),
    }
  })
  check('左上角是返回按钮', header.back !== null && header.back.text.includes('返回'), JSON.stringify(header.back))
  check('右上角是关闭按钮', header.close !== null, JSON.stringify(header.close))
  check('按钮放大了（≥34px 高）', (header.back?.h ?? 0) >= 34 && (header.close?.h ?? 0) >= 34, `${header.back?.h}px / ${header.close?.h}px`)
  check('标题文字已删除', header.title === false)
  check('快捷键按钮已删除', header.hotkey === false)
  check('全屏按钮已删除', header.fullscreen === false)
  check('顶部没有多余空白', header.topGap !== null && header.topGap <= 6, `差值 ${header.topGap}px`)

  // ---- 2. sidebar follows the map --------------------------------------
  const sidebarOpen = await page.evaluate(() => window.__harness.sidebarState())
  check('打开地图时侧栏自动收起', sidebarOpen.collapsed === true && sidebarOpen.width < 80, JSON.stringify(sidebarOpen))
  await page.click('[class*="tm_backButton"]')
  await page.waitForTimeout(400)
  const sidebarBack = await page.evaluate(() => window.__harness.sidebarState())
  check('返回对话时侧栏自动展开', sidebarBack.collapsed === false && sidebarBack.width > 150, JSON.stringify(sidebarBack))
  await openMap()
  check('再次打开仍会收起侧栏', (await page.evaluate(() => window.__harness.sidebarState())).collapsed === true)

  // ---- 3. grid ---------------------------------------------------------
  const grid = await page.evaluate(() => {
    const cards = []
    for (const el of document.querySelectorAll('.react-flow__node')) {
      const id = el.getAttribute('data-id')
      if (!id || id.startsWith('frame-') || id.startsWith('stack-')) continue
      const r = el.getBoundingClientRect()
      cards.push({ id, x: r.x, y: r.y, w: r.width, h: r.height })
    }
    const overlaps = []
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j]
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push([a.id, b.id])
      }
    }
    return { count: cards.length, overlaps }
  })
  check('卡片互不重叠', grid.overlaps.length === 0, `${grid.count} 张可见卡，重叠 ${grid.overlaps.length} 对`)

  const autoSync = await page.evaluate(() =>
    [...document.querySelectorAll('.react-flow__node [class*="cardTitle"]')]
      .map(el => el.textContent.trim())
      .includes('自动同步进来的会话'))
  check('打开地图时自动同步新会话', autoSync === true)

  // ---- 4. overflow stack + drawer -------------------------------------
  const stack = await page.evaluate(() => {
    const el = document.querySelector('.react-flow__node[data-id^="stack-"]')
    if (el === null) return null
    const r = el.getBoundingClientRect()
    const badge = el.querySelector('[class*="stackBadge"]')
    const frames = window.__harness.nodeBoxes().frames['ws-daily']
    return {
      badge: badge?.textContent ?? '',
      rightGap: Math.round(frames.x + frames.w - (r.x + r.width)),
      bottomGap: Math.round(frames.y + frames.h - (r.y + r.height)),
    }
  })
  check('装不下时出现堆叠格子', stack !== null && stack.badge === '+3', JSON.stringify(stack))
  check('堆叠格子落在文件夹右下角', stack !== null && stack.rightGap >= 10 && stack.rightGap <= 48 && stack.bottomGap >= 0 && stack.bottomGap <= 72,
    `右 ${stack?.rightGap}px / 下 ${stack?.bottomGap}px`)

  await page.click('.react-flow__node[data-id^="stack-"] [class*="stackFace"]')
  await page.waitForTimeout(400)
  const drawer = await page.evaluate(() => {
    const el = document.querySelector('[class*="tm_drawer"]')
    if (el === null) return null
    const cards = [...el.querySelectorAll('[data-stack-card]')]
    return {
      count: cards.length,
      width: cards[0] === undefined ? 0 : Math.round(cards[0].getBoundingClientRect().width),
      scrollable: (() => {
        const scroller = el.querySelector('[class*="drawerScroll"]')
        return scroller !== null && scroller.scrollHeight > scroller.clientHeight + 4
      })(),
      running: cards.some(card => getComputedStyle(card).animationName.includes('lamp-white')),
      done: cards.some(card => getComputedStyle(card).boxShadow.includes('52, 199, 89')),
    }
  })
  check('点堆叠格子打开抽屉，列出全部对话', drawer?.count === 5, `${drawer?.count} 张`)
  check('抽屉里的卡片是 1:1 尺寸（224px）', drawer?.width === 224, `${drawer?.width}px`)
  check('抽屉内容可滚动', drawer?.scrollable === true)
  check('运行中 = 白光呼吸', drawer?.running === true)
  check('已完成 = 绿光', drawer?.done === true)

  const scrollBefore = await page.evaluate(() => document.querySelector('[class*="drawerScroll"]').scrollTop)
  const scrollBox = await box('[class*="drawerScroll"]')
  await page.mouse.move(scrollBox.x + scrollBox.w / 2, scrollBox.y + scrollBox.h / 2)
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(600)
  const scrollAfter = await page.evaluate(() => document.querySelector('[class*="drawerScroll"]').scrollTop)
  check('滚轮切换视图', scrollAfter > scrollBefore, `${scrollBefore} → ${Math.round(scrollAfter)}`)
  await page.screenshot({ path: path.join(shots, 'probe-drawer.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('Esc 收起抽屉', await page.evaluate(() => document.querySelector('[class*="tm_drawer"]') === null))

  // ---- 5. panel model --------------------------------------------------
  check('地图是 main 面板（不是遮罩）', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === 'talk-map')
  await page.click('[class*="tm_backButton"]')
  await page.waitForTimeout(400)
  check('返回按钮回到对话', await page.evaluate(() => document.querySelector('[data-harness-placeholder]') !== null))
  await openMap()

  // ---- 6. activity promotes -------------------------------------------
  const orderOf = (sessionIds) => page.evaluate((ids) => {
    const state = window.__harness.state()
    return [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(entry => ids.includes(entry.id))
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))
      .map(entry => state.cards[entry.id]?.sessionId)
  }, sessionIds)
  const beforeTouch = await orderOf(['card-1', 'card-2'])
  await page.evaluate(() => window.__harness.touch('s5'))
  await page.waitForTimeout(700)
  const afterTouch = await orderOf(['card-1', 'card-2', 'card-5'])
  check('活跃会话被提到开头', afterTouch[0] === 's5', `${JSON.stringify(beforeTouch)} → ${JSON.stringify(afterTouch.slice(0, 2))}`)

  // ---- 7. resize: edges + corners -------------------------------------
  const handleAxes = await page.evaluate(() =>
    [...document.querySelectorAll('[data-talkmap-workspace="ws-daily"] [data-talkmap-resize]')]
      .map(el => el.getAttribute('data-talkmap-resize')))
  check('四边四角共 8 个拉伸把手', ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].every(axis => handleAxes.includes(axis)), JSON.stringify(handleAxes))

  const labBefore = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-lab']
  const north = await page.evaluate(() => {
    const r = document.querySelector('[data-talkmap-workspace="ws-lab"] [data-talkmap-resize="n"]').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.move(north.x, north.y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(north.x, north.y - i * 10)
  await page.mouse.up()
  await page.waitForTimeout(600)
  const labAfterNorth = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-lab']
  check('上边把手改高度并带动上边界', labAfterNorth.h > labBefore.h + 10 && labAfterNorth.y < labBefore.y - 5,
    `${labBefore.y}/${labBefore.h} → ${labAfterNorth.y}/${labAfterNorth.h}`)

  const cornerBefore = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-lab']
  const corner = await page.evaluate(() => {
    const el = document.querySelector('[data-talkmap-workspace="ws-lab"] [data-talkmap-resize="se"]')
    const r = el.getBoundingClientRect()
    const x = r.x + r.width / 2, y = r.y + r.height / 2
    const hit = document.elementFromPoint(x, y)
    return { x, y, hit: hit === null ? 'nothing' : String(hit.className) }
  })
  check('对角把手在指针下可命中', corner.hit.includes('wsFrameResizeSe'), corner.hit)
  await page.mouse.move(corner.x, corner.y)
  await page.waitForTimeout(80)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(corner.x + i * 12, corner.y + i * 16)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(700)
  const cornerAfter = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-lab']
  check('对角把手同时改宽高', cornerAfter.w > cornerBefore.w + 10 && cornerAfter.h > cornerBefore.h + 10,
    `${cornerBefore.w}x${cornerBefore.h} → ${cornerAfter.w}x${cornerAfter.h}`)
  await page.screenshot({ path: path.join(shots, 'probe-resized.png') })

  // ---- 8. new chat goes to the shell's own page ------------------------
  const frames = await page.evaluate(() => window.__harness.nodeBoxes().frames)
  const medkit = frames['ws-medkit']
  const daily = frames['ws-daily']
  const clickX = Math.max(medkit.x + 60, daily.x + daily.w + 30)
  await page.mouse.dblclick(clickX, medkit.y + medkit.h - 22)
  await page.waitForTimeout(600)
  const started = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.startSession').at(-1))
  check('双击工作区 = 用系统页面新建该工作区对话', started?.detail?.workspaceId === 'ws-medkit', JSON.stringify(started?.detail))
  check('新建对话后离开地图', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === null)
  check('地图里不再有内嵌草稿面板', await page.evaluate(() => document.querySelector('[class*="tm_draftCard"]') === null))
  await openMap()

  // ---- 9. click has no colour toolbar ---------------------------------
  const s6 = await cardPoint('s6')
  await page.mouse.click(s6.x, s6.y - 6)
  await page.waitForTimeout(300)
  check('单击对话不再弹出颜色面板', await page.evaluate(() => document.querySelector('[class*="tm_colorToolbar"]') === null))

  // ---- 10. pin / archive / delete / batch -----------------------------
  const pinPoint = await cardPoint('s7')
  await page.mouse.click(pinPoint.x, pinPoint.y, { button: 'right' })
  await page.waitForTimeout(400)
  const cardMenu = await menuItems()
  check('右键菜单含置顶/归档/删除/批量',
    ['置顶', '归档', '删除会话', '批量操作'].every(needle => cardMenu.some(text => text.includes(needle))),
    JSON.stringify(cardMenu))
  await clickMenuItem('置顶')
  const pinLog = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.pinSession').at(-1))
  const pinnedNow = await page.evaluate(() => window.__harness.pinned())
  check('置顶调用原生 pinSession', pinLog?.detail === 's7', JSON.stringify(pinLog?.detail))
  check('置顶状态与侧栏同源', pinnedNow.includes('s7'), JSON.stringify(pinnedNow))
  await page.waitForTimeout(500)
  const medkitOrder = await page.evaluate(() => {
    const state = window.__harness.state()
    return [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(entry => ['card-6', 'card-7'].includes(entry.id))
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))
      .map(entry => state.cards[entry.id]?.sessionId)
  })
  check('置顶后卡片排到最前', medkitOrder[0] === 's7', JSON.stringify(medkitOrder))

  const beforeArchive = await page.evaluate(() => document.querySelectorAll('.react-flow__node[data-id^="card-"]').length)
  const archivePoint = await cardPoint('s10')
  await page.mouse.click(archivePoint.x, archivePoint.y, { button: 'right' })
  await page.waitForTimeout(400)
  await clickMenuItem('归档')
  const archiveLog = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.archiveSession').at(-1))
  const afterArchive = await page.evaluate(() => document.querySelectorAll('.react-flow__node[data-id^="card-"]').length)
  check('右键归档调用 archiveSession 并移出地图',
    archiveLog?.detail?.sessionId === 's10' && afterArchive === beforeArchive - 1,
    `${JSON.stringify(archiveLog?.detail)} / ${beforeArchive} → ${afterArchive}`)

  const deletePoint = await cardPoint('s9')
  await page.mouse.click(deletePoint.x, deletePoint.y, { button: 'right' })
  await page.waitForTimeout(400)
  await clickMenuItem('删除会话')
  const trashCall = await page.evaluate(() => window.__harness.recycleCalls().at(-1))
  check('删除走 dsh-recycle-bin 的 trash 接口', trashCall?.action === 'trash' && trashCall?.sessionId === 's9', JSON.stringify(trashCall))

  const batchPoint = await cardPoint('s6')
  await page.mouse.click(batchPoint.x, batchPoint.y, { button: 'right' })
  await page.waitForTimeout(400)
  await clickMenuItem('批量操作')
  const barShown = await page.evaluate(() => document.querySelector('[class*="tm_batchBar"]') !== null)
  const second = await cardPoint('s7')
  await page.mouse.click(second.x, second.y - 6)
  await page.waitForTimeout(400)
  const batchCount = await page.evaluate(() => document.querySelector('[class*="tm_batchCount"]')?.textContent ?? '')
  check('批量操作：工具条出现并可多选', barShown && /2/.test(batchCount), `${barShown} / ${batchCount}`)
  await page.screenshot({ path: path.join(shots, 'probe-batch.png') })
  await page.evaluate(() => {
    const target = [...document.querySelectorAll('[class*="tm_batchAction"]')].find(el => el.textContent.trim() === '删除')
    target?.click()
  })
  await page.waitForTimeout(800)
  const batchCall = await page.evaluate(() => window.__harness.recycleCalls().at(-1))
  check('批量删除一次提交 trashMany', batchCall?.action === 'trashMany' && (batchCall?.sessionIds?.length ?? 0) === 2, JSON.stringify(batchCall))
  check('批量删除后退出批量模式', await page.evaluate(() => document.querySelector('[class*="tm_batchBar"]') === null))

  // ---- 11. no runtime errors ------------------------------------------
  const pluginErrors = consoleErrors.filter(text => !text.includes('favicon'))
  check('无 JS 异常', pluginErrors.length === 0, pluginErrors.slice(0, 2).join(' | '))
} catch (error) {
  console.error('\nprobe crashed:', error)
  failures += 1
} finally {
  try { await browser?.close() } catch { /* already gone */ }
  edge.kill()
  server.close()
}

const failed = results.filter(entry => !entry.passed)
failures += failed.length
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('failed:')
  for (const entry of failed) console.log(`  - ${entry.name}: ${entry.detail ?? ''}`)
}
process.exit(failures === 0 ? 0 : 1)
