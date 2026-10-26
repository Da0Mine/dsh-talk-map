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

  // ---- 3b. status chip text + colour follow the lamp -------------------
  const readChips = () => page.evaluate(() => {
    const out = {}
    // Grid cards and drawer cards both carry the session id, so one scan covers
    // whichever surface is on screen.
    for (const root of document.querySelectorAll('[data-talkmap-session]')) {
      const sessionId = root.getAttribute('data-talkmap-session')
      const chip = root.querySelector('[data-talkmap-chip]')
      out[sessionId] = chip === null
        ? null
        : {
            kind: chip.getAttribute('data-talkmap-chip'),
            text: chip.textContent.trim(),
            color: getComputedStyle(chip).color,
          }
    }
    return out
  })
  const chips = await readChips()
  check('运行中 → 文字「正在运行」白色',
    chips.s1?.text === '正在运行' && chips.s1.color === 'rgb(255, 255, 255)', JSON.stringify(chips.s1))
  check('等你回复 → 文字「等你回复」琥珀',
    chips.s2?.text === '等你回复' && /245, 178, 46/.test(chips.s2?.color ?? ''), JSON.stringify(chips.s2))
  await page.evaluate(() => window.__harness.raiseError('s2'))
  await page.waitForTimeout(500)
  const afterError = await readChips()
  check('异常终止 → 文字「异常终止」红色',
    afterError.s2?.text === '异常终止' && /242, 78, 78/.test(afterError.s2?.color ?? ''), JSON.stringify(afterError.s2))

  // ---- 3c. a brand-new conversation takes the head of its folder -------
  await page.evaluate(() => window.__harness.addSession('ws-daily', 's11', '刚刚新建的对话'))
  await page.click('[class*="tm_backButton"]')
  await page.waitForTimeout(400)
  await openMap()
  const headOrder = await page.evaluate(() => {
    const state = window.__harness.state()
    // Global reading order: the daily folder is the top-left one, so its first
    // slot is the board's first card.
    return [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(entry => state.cards[entry.id] !== undefined)
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))
      .map(entry => state.cards[entry.id].sessionId)
  })
  check('新建的对话排到文件夹最前', headOrder[0] === 's11', JSON.stringify(headOrder.slice(0, 3)))

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
  check('装不下时出现堆叠格子', stack !== null && stack.badge === '+4', JSON.stringify(stack))
  check('堆叠格子落在文件夹右下角', stack !== null && stack.rightGap >= 10 && stack.rightGap <= 48 && stack.bottomGap >= 0 && stack.bottomGap <= 72,
    `右 ${stack?.rightGap}px / 下 ${stack?.bottomGap}px`)

  await page.click('.react-flow__node[data-id^="stack-"] [class*="stackFace"]')
  await page.waitForTimeout(400)
  const drawer = await page.evaluate(() => {
    const el = document.querySelector('[class*="tm_drawer"]:not([class*="Backdrop"])')
    if (el === null) return null
    const cards = [...el.querySelectorAll('[data-stack-card]')]
    const tops = new Set(cards.map(card => card.offsetTop))
    // Running = steady faint halo + a spinning ring (::after); the other lamps
    // are breathing shadows.
    const withRing = cards
      .map(card => ({
        ring: getComputedStyle(card, '::after').animationName,
        animation: getComputedStyle(card).animationName,
        shadow: getComputedStyle(card).boxShadow,
      }))
      .find(entry => entry.ring.includes('ring-sweep')) ?? null
    return {
      count: cards.length,
      width: cards[0] === undefined ? 0 : Math.round(cards[0].getBoundingClientRect().width),
      rows: tops.size,
      runningRing: withRing !== null,
      runningCard: withRing,
      doneBreath: cards.some(card => getComputedStyle(card).animationName.includes('lamp-green')),
      chipCount: el.querySelectorAll('[data-talkmap-chip]').length,
    }
  })
  check('点堆叠格子打开抽屉，列出全部对话', drawer?.count === 6, `${drawer?.count} 张`)
  check('抽屉里的卡片是 1:1 尺寸（224px）', drawer?.width === 224, `${drawer?.width}px`)
  check('抽屉里至少两行（卡片排满整行再换行）', (drawer?.rows ?? 0) >= 2, `rows=${drawer?.rows}`)
  check('运行中 = 环绕卡片的加载光环', drawer?.runningRing === true)
  check('已完成 = 绿光呼吸', drawer?.doneBreath === true)
  check('抽屉里的卡片也带状态胶囊', (drawer?.chipCount ?? 0) >= 3, `chips=${drawer?.chipCount}`)
  check('运行中不呼吸（没有 pulse 动画）', !(drawer?.runningCard?.animation ?? '').includes('lamp'), drawer?.runningCard?.animation)
  check('运行中是微弱白光（不是大范围光晕）', (() => {
    const alphas = [...(drawer?.runningCard?.shadow ?? '').matchAll(/rgba\(255, 255, 255, ([\d.]+)\)/g)].map(match => Number(match[1]))
    return alphas.length > 0 && Math.max(...alphas) <= 0.25
  })(), (drawer?.runningCard?.shadow ?? '').slice(0, 90))

  const ringMotion = await page.evaluate(async () => {    const cards = [...document.querySelectorAll('[data-stack-card]')]
    const card = cards.find(node => getComputedStyle(node, '::after').animationName.includes('ring-sweep'))
    if (card === undefined) return null
    const angle1 = getComputedStyle(card, '::after').getPropertyValue('--tm-ring-angle').trim()
    await new Promise(resolve => setTimeout(resolve, 400))
    const after = getComputedStyle(card, '::after')
    return {
      angle1,
      angle2: after.getPropertyValue('--tm-ring-angle').trim(),
      transform: after.transform,
    }
  })
  check('光环是流光（渐变角在动，环本身不转）',
    ringMotion !== null && ringMotion.transform === 'none' && ringMotion.angle1 !== ringMotion.angle2,
    JSON.stringify(ringMotion))
  // Close-up of the running card, for eyeballing the sweep. Padded, because the
  // ring is drawn 2px OUTSIDE the card box (element screenshots clip to the box).
  const runningBox = await page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-stack-card]')]
      .find(node => getComputedStyle(node, '::after').animationName.includes('ring-sweep'))
    if (card === undefined) return null
    const r = card.getBoundingClientRect()
    const style = getComputedStyle(card, '::after')
    return {
      clip: { x: r.x - 12, y: r.y - 12, width: r.width + 24, height: r.height + 24 },
      bg: style.backgroundImage.slice(0, 60),
      composite: style.maskComposite,
    }
  })
  if (runningBox !== null) {
    await page.screenshot({ path: path.join(shots, 'probe-ring.png'), clip: runningBox.clip })
  }

  const drawerGrid = await page.evaluate(() => {
    const panel = document.querySelector('[class*="tm_drawer"]:not([class*="Backdrop"])')
    const cards = [...document.querySelectorAll('[data-stack-card]')]
    const firstTop = Math.min(...cards.map(card => card.offsetTop))
    return {
      width: panel === null ? 0 : Math.round(panel.getBoundingClientRect().width),
      firstRow: cards.filter(card => card.offsetTop === firstTop).length,
      total: cards.length,
    }
  })
  check('抽屉是多列网格（不是一列）', drawerGrid.firstRow >= 2, JSON.stringify(drawerGrid))
  check('抽屉更宽（≥900px）', drawerGrid.width >= 900, `${drawerGrid.width}px`)

  const scrollBefore = await page.evaluate(() => {
    const scroller = document.querySelector('[class*="drawerScroll"]')
    return { top: scroller.scrollTop, overflow: scroller.scrollHeight > scroller.clientHeight + 4 }
  })
  const scrollBox = await box('[class*="drawerScroll"]')
  await page.mouse.move(scrollBox.x + scrollBox.w / 2, scrollBox.y + scrollBox.h / 2)
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(600)
  const scrollAfter = await page.evaluate(() => document.querySelector('[class*="drawerScroll"]').scrollTop)
  // The drawer is big enough that a handful of cards fit on one screen; the
  // wheel pager only has something to do once the grid overflows.
  check('滚轮翻页（有溢出时滚动，无溢出则整屏可见）',
    scrollBefore.overflow ? scrollAfter > scrollBefore.top : scrollAfter === scrollBefore.top,
    `overflow=${scrollBefore.overflow} ${scrollBefore.top} → ${Math.round(scrollAfter)}`)
  await page.screenshot({ path: path.join(shots, 'probe-drawer.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('Esc 收起抽屉', await page.evaluate(() => document.querySelector('[class*="tm_drawer"]:not([class*="Backdrop"])') === null))

  // ---- 4b. finished while the map is up (the reported bug) --------------
  // Uses a card that is on the GRID (deterministic DOM, no drawer involved).
  // The harness never sets completionUnread by itself, so a green light here can
  // only come from the map's own projection — the "opened the map from this
  // conversation" case, where the shell stays quiet.
  const chatId = await page.evaluate(() => {
    const state = window.__harness.state()
    const entry = [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(item => state.cards[item.id] !== undefined && item.r.y > 0)
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))[0]
    return entry === undefined ? null : state.cards[entry.id].sessionId
  })
  check('找到一个网格上的会话用于测试', chatId !== null, String(chatId))
  await page.evaluate((id) => window.__harness.setRunning(id, true), chatId)
  await page.waitForTimeout(500)
  const runningNow = (await readChips())[chatId]
  check('地图里跑到一半 → 该卡显示正在运行', runningNow?.kind === 'running', JSON.stringify(runningNow))
  await page.evaluate((id) => window.__harness.setRunning(id, false), chatId)
  await page.waitForTimeout(600)
  const finishedNow = (await readChips())[chatId]
  check('跑完 → 自动变「待查看」绿灯（不靠宿主的 unread）',
    finishedNow?.kind === 'done' && finishedNow.text === '待查看' && /52, 199, 89/.test(finishedNow.color ?? ''),
    JSON.stringify(finishedNow))

  // Opening it counts as reading it.
  const chatPoint = await cardPoint(chatId)
  if (chatPoint !== null) await page.mouse.click(chatPoint.x, chatPoint.y - 6)
  await page.waitForTimeout(500)
  const openedChat = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.openSession').at(-1))
  check('点开该会话', openedChat?.detail === chatId, JSON.stringify(openedChat?.detail))
  await openMap()
  await page.waitForTimeout(600)
  const afterAck = (await readChips())[chatId]
  check('打开过后不再显示待查看', afterAck?.kind !== 'done', JSON.stringify(afterAck))

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

  // The case that matters in real use: the message arrives while the map is
  // CLOSED (panel unmounted) — the promotion must survive the remount.
  const firstCardSession = () => page.evaluate(() => {
    const state = window.__harness.state()
    const entry = [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(item => state.cards[item.id] !== undefined)
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))[0]
    return entry === undefined ? null : state.cards[entry.id].sessionId
  })
  await page.click('[class*="tm_backButton"]')
  await page.waitForTimeout(400)
  await page.evaluate(() => window.__harness.touch('s4'))
  await openMap()
  await page.waitForTimeout(600)
  check('关着地图时发的消息，重新打开也会提前', (await firstCardSession()) === 's4', `first=${await firstCardSession()}`)

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
  // Aim at the folder's transparent body: a card would open on the first click
  // now that single-click navigation exists.
  const medkit = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-medkit']
  const panePoint = await page.evaluate((frameBox) => {
    for (let dy = 20; dy < frameBox.h - 8; dy += 6) {
      for (let dx = 20; dx < frameBox.w - 8; dx += 6) {
        const x = frameBox.x + dx, y = frameBox.y + dy
        const hit = document.elementFromPoint(x, y)
        if (hit !== null && hit.classList.contains('react-flow__pane')) return { x, y }
      }
    }
    return null
  }, medkit)
  check('文件夹内有可用于双击的透明区', panePoint !== null, JSON.stringify(panePoint))
  await page.mouse.dblclick(panePoint.x, panePoint.y)
  await page.waitForTimeout(600)
  const started = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.startSession').at(-1))
  check('双击工作区 = 用系统页面新建该工作区对话', started?.detail?.workspaceId === 'ws-medkit', JSON.stringify(started?.detail))
  check('新建对话后离开地图', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === null)
  check('地图里不再有内嵌草稿面板', await page.evaluate(() => document.querySelector('[class*="tm_draftCard"]') === null))
  await openMap()

  // ---- 9. workspace colour (frames only) -------------------------------
  const labelPoint = await page.evaluate(() => {
    const el = document.querySelector('[data-talkmap-workspace="ws-medkit"] [class*="wsFrameLabel"]')
    const r = el.getBoundingClientRect()
    return { x: r.x + 24, y: r.y + r.height / 2 }
  })
  await page.mouse.click(labelPoint.x, labelPoint.y)
  await page.waitForTimeout(400)
  const toolbarShown = await page.evaluate(() => document.querySelector('[class*="tm_colorToolbar"]') !== null)
  check('选中工作区后出现颜色工具条', toolbarShown === true)
  await page.evaluate(() => {
    const swatch = document.querySelectorAll('[class*="tm_colorSwatch"]')
    swatch[5]?.click() // blue
  })
  await page.waitForTimeout(500)
  const colorState = await page.evaluate(() => {
    const lastGlobal = window.__harness.posts.filter(p => p.path.includes('talkmap/global') || p.path.includes('talk-map/global')).at(-1)
    const label = document.querySelector('[data-talkmap-workspace="ws-medkit"] [class*="wsFrameLabel"]')
    const frame = document.querySelector('[data-talkmap-workspace="ws-medkit"]')
    return {
      saved: lastGlobal?.body?.global?.wsColors?.['ws-medkit'] ?? null,
      labelBorder: label === null ? null : getComputedStyle(label).borderTopColor,
      frameBorder: frame === null ? null : getComputedStyle(frame).borderTopColor,
      // The folder's inside must NOT be tinted.
      frameBackground: frame === null ? null : getComputedStyle(frame).backgroundColor,
    }
  })
  check('颜色写入 wsColors 并落到标题栏/边框',
    colorState.saved === 'blue' && (colorState.labelBorder ?? '').includes('62, 99, 221') && (colorState.frameBorder ?? '').includes('62, 99, 221'),
    JSON.stringify(colorState))
  check('工作区内部不填充颜色',
    colorState.frameBackground === 'rgba(0, 0, 0, 0)' || colorState.frameBackground === 'transparent',
    colorState.frameBackground)
  // Clear it again so the rest of the run starts from a neutral frame.
  await page.evaluate(() => {
    const clear = document.querySelector('[class*="tm_colorSwatchClear"]')
    clear?.click()
  })
  await page.waitForTimeout(400)

  // ---- 10. title bar wins over the top edge handle ---------------------
  const beforeTitleDrag = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-medkit']
  const titleGrab = await page.evaluate(() => {
    const el = document.querySelector('[data-talkmap-workspace="ws-medkit"] [class*="wsFrameLabel"]')
    const r = el.getBoundingClientRect()
    // Lower edge of the chip = inside the frame's top band, where the N handle sits.
    return { x: r.x + r.width / 2, y: r.y + r.height - 2, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height - 2)?.className ?? '' }
  })
  check('标题栏压在顶边把手之上', String(titleGrab.hit).includes('wsFrameLabel'), titleGrab.hit)
  await page.mouse.move(titleGrab.x, titleGrab.y)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(titleGrab.x + i * 8, titleGrab.y + i * 8)
  await page.mouse.up()
  await page.waitForTimeout(600)
  const afterTitleDrag = (await page.evaluate(() => window.__harness.nodeBoxes().frames))['ws-medkit']
  check('拖标题栏移动整个工作区（不改尺寸）',
    Math.abs(afterTitleDrag.w - beforeTitleDrag.w) <= 1 && Math.abs(afterTitleDrag.h - beforeTitleDrag.h) <= 1
      && (Math.abs(afterTitleDrag.x - beforeTitleDrag.x) > 10 || Math.abs(afterTitleDrag.y - beforeTitleDrag.y) > 10),
    `${beforeTitleDrag.x}/${beforeTitleDrag.y} ${beforeTitleDrag.w}x${beforeTitleDrag.h} → ${afterTitleDrag.x}/${afterTitleDrag.y} ${afterTitleDrag.w}x${afterTitleDrag.h}`)

  // ---- 11. pin / archive / delete / batch -----------------------------
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

  // Batch mode: every card wears a tick box, and picking one ticks it.
  const batchPoint = await cardPoint('s6')
  await page.mouse.click(batchPoint.x, batchPoint.y, { button: 'right' })
  await page.waitForTimeout(400)
  await clickMenuItem('批量操作')
  const boxes = await page.evaluate(() => ({
    bar: document.querySelector('[class*="tm_batchBar"]') !== null,
    total: document.querySelectorAll('[data-talkmap-pick]').length,
    checked: document.querySelectorAll('[data-talkmap-pick][aria-checked="true"]').length,
  }))
  check('批量模式每张卡右上角都有勾选框', boxes.bar && boxes.total >= 4, JSON.stringify(boxes))
  check('进入批量时第一张已勾选', boxes.checked === 1, `checked=${boxes.checked}`)
  const second = await cardPoint('s7')
  await page.mouse.click(second.x, second.y - 6)
  await page.waitForTimeout(400)
  const batchAfterPick = await page.evaluate(() => ({
    count: document.querySelector('[class*="tm_batchCount"]')?.textContent ?? '',
    checked: document.querySelectorAll('[data-talkmap-pick][aria-checked="true"]').length,
  }))
  check('再点一张 → 勾选框变勾 + 计数 2', /2/.test(batchAfterPick.count) && batchAfterPick.checked === 2, JSON.stringify(batchAfterPick))
  await page.screenshot({ path: path.join(shots, 'probe-batch.png') })
  await page.evaluate(() => {
    const target = [...document.querySelectorAll('[class*="tm_batchAction"]')].find(el => el.textContent.trim() === '删除')
    target?.click()
  })
  await page.waitForTimeout(800)
  const batchCall = await page.evaluate(() => window.__harness.recycleCalls().at(-1))
  check('批量删除一次提交 trashMany', batchCall?.action === 'trashMany' && (batchCall?.sessionIds?.length ?? 0) === 2, JSON.stringify(batchCall))
  check('批量删除后退出批量模式', await page.evaluate(() => document.querySelector('[class*="tm_batchBar"]') === null))

  // ---- 12. single click opens the conversation ------------------------
  // Click whatever card is currently first on the board — by this point the
  // mutations above have removed several of the fixtures.
  const clickTarget = await page.evaluate(() => {
    const state = window.__harness.state()
    const entry = [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(item => state.cards[item.id] !== undefined)
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))[0]
    return { sessionId: state.cards[entry.id].sessionId, x: entry.r.x + 40, y: entry.r.y + 14 }
  })
  await page.mouse.click(clickTarget.x, clickTarget.y - 6)
  await page.waitForTimeout(600)
  const opened = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.openSession').at(-1))
  check('左键单击卡片即跳转对话', opened?.detail === clickTarget.sessionId, `${JSON.stringify(opened?.detail)} vs ${clickTarget.sessionId}`)
  check('跳转后离开地图', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === null)

  // ---- 13. no runtime errors ------------------------------------------
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
