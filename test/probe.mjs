/**
 * Headless-Edge probe for the talk-map client bundle.
 *
 * Runs the real built artifact in a throwaway headless Edge (own
 * --user-data-dir, own debugging port) and asserts the behaviours this project
 * actually cares about. Never touches the user's browser profile.
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

  await page.goto(`http://127.0.0.1:${PORT}/test/index.html`)
  await page.waitForSelector('.react-flow__node', { timeout: 10000 })
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(shots, 'probe-initial.png') })

  // ---- 1. header ------------------------------------------------------
  const header = await page.evaluate(() => {
    const box = el => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height), text: el.textContent.trim() }
    }
    return {
      back: box(document.querySelector('[class*="tm_backButton"]')),
      close: box(document.querySelector('[class*="tm_closeButton"]')),
      title: document.querySelector('[class*="headerTitle"]') !== null,
    }
  })
  check('左上角是返回按钮', header.back !== null && header.back.text.includes('返回'), JSON.stringify(header.back))
  check('右上角有关闭按钮', header.close !== null, JSON.stringify(header.close))
  check('按钮放大了（≥34px 高）', (header.back?.h ?? 0) >= 34 && (header.close?.h ?? 0) >= 34, `back ${header.back?.h}px / close ${header.close?.h}px`)
  check('标题文字已删除', header.title === false)

  // ---- 2. grid: no overlap, reading order ------------------------------
  const grid = await page.evaluate(() => {
    const cards = []
    for (const el of document.querySelectorAll('.react-flow__node')) {
      const id = el.getAttribute('data-id')
      if (!id || id.startsWith('frame-') || id === 'draft' || id.startsWith('stack-')) continue
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
    const state = window.__harness.state()
    const ordered = cards
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .map(c => state.cards[c.id]?.sessionId)
    return { count: cards.length, overlaps, ordered }
  })
  check('卡片互不重叠', grid.overlaps.length === 0, `${grid.count} 张可见卡，重叠 ${grid.overlaps.length} 对`)
  // The daily folder is 3x1 = 3 slots, 5 conversations → 2 cards + the stack cell.
  check('装不下时只排可见的卡', grid.ordered.slice(0, 2).join(',') === 's1,s2', `可见顺序 ${JSON.stringify(grid.ordered)}`)

  // ---- 3. overflow stack cell -----------------------------------------
  const stack = await page.evaluate(() => {
    const el = document.querySelector('.react-flow__node[data-id^="stack-"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const badge = el.querySelector('[class*="stackBadge"]')
    const frames = window.__harness.nodeBoxes().frames['ws-daily']
    return {
      id: el.getAttribute('data-id'),
      text: el.textContent.trim(),
      badge: badge?.textContent ?? '',
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      rightGap: Math.round(frames.x + frames.w - (r.x + r.width)),
      bottomGap: Math.round(frames.y + frames.h - (r.y + r.height)),
    }
  })
  check('溢出时右下角出现堆叠格子', stack !== null && stack.badge === '+3', `${stack?.id} badge=${stack?.badge}`)
  check('堆叠格子落在文件夹右下角', stack !== null && stack.rightGap >= 12 && stack.rightGap <= 48 && stack.bottomGap >= 0 && stack.bottomGap <= 72,
    `右 ${stack?.rightGap}px / 下 ${stack?.bottomGap}px`)

  await page.click('.react-flow__node[data-id^="stack-"] [class*="stackFace"]')
  await page.waitForTimeout(400)
  const drawer = await page.evaluate(() => {
    const el = document.querySelector('[class*="tm_drawer"]')
    if (!el) return null
    const cards = [...el.querySelectorAll('[data-stack-card]')]
    const first = cards[0]
    return {
      count: cards.length,
      width: first === undefined ? 0 : Math.round(first.getBoundingClientRect().width),
      scrollable: (() => {
        const scroller = el.querySelector('[class*="drawerScroll"]')
        return scroller !== null && scroller.scrollHeight > scroller.clientHeight + 4
      })(),
      titles: cards.map(card => card.textContent.slice(0, 12)),
    }
  })
  check('点堆叠格子打开抽屉，列出全部对话', drawer?.count === 5, `${drawer?.count} 张`)
  check('抽屉里的卡片是 1:1 尺寸（224px）', drawer?.width === 224, `${drawer?.width}px`)
  check('抽屉内容可滚动', drawer?.scrollable === true)

  const drawerLamps = await page.evaluate(() => {
    const bySession = {}
    for (const card of document.querySelectorAll('[data-stack-card]')) {
      const title = card.querySelector('[class*="cardTitle"]')?.textContent ?? ''
      const inner = card
      bySession[title] = { cls: inner.className, shadow: getComputedStyle(inner).boxShadow, animation: getComputedStyle(inner).animationName }
    }
    return bySession
  })
  const runningCard = Object.values(drawerLamps).find(entry => entry.animation.includes('lamp-white'))
  const doneCard = Object.values(drawerLamps).find(entry => entry.shadow.includes('52, 199, 89'))
  check('运行中 = 白光呼吸', runningCard !== undefined, runningCard?.animation)
  check('已完成 = 绿光', doneCard !== undefined)

  const scrollBefore = await page.evaluate(() => document.querySelector('[class*="drawerScroll"]').scrollTop)
  const scrollBox = await page.evaluate(() => {
    const r = document.querySelector('[class*="drawerScroll"]').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.move(scrollBox.x, scrollBox.y)
  await page.mouse.wheel(0, 300)
  await page.waitForTimeout(600)
  const scrollAfter = await page.evaluate(() => document.querySelector('[class*="drawerScroll"]').scrollTop)
  check('滚轮切换视图（滚动生效）', scrollAfter > scrollBefore, `${scrollBefore} → ${Math.round(scrollAfter)}`)
  await page.screenshot({ path: path.join(shots, 'probe-drawer.png') })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('Esc 收起抽屉', await page.evaluate(() => document.querySelector('[class*="tm_drawer"]') === null))

  // ---- 4. panel model --------------------------------------------------
  check('地图是 main 面板（不是全覆盖遮罩）', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === 'talk-map')
  await page.click('[class*="tm_backButton"]')
  await page.waitForTimeout(400)
  const afterBack = await page.evaluate(() => ({ panel: window.__harness.panelState(), placeholder: document.querySelector('[data-harness-placeholder]') !== null }))
  check('返回按钮回到对话', afterBack.panel.selectedPanel === null && afterBack.placeholder)
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
  await page.waitForTimeout(500)
  check('快捷键重新打开面板', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === 'talk-map')

  // ---- 5. an active conversation jumps the queue -----------------------
  const beforeTouch = await page.evaluate(() => {
    const state = window.__harness.state()
    return [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(entry => entry.id?.startsWith('card-'))
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))
      .map(entry => state.cards[entry.id]?.sessionId)
  })
  // s5 is folded and last; "sending a message" must pull it to the first slot.
  await page.evaluate(() => window.__harness.touch('s5'))
  await page.waitForTimeout(700)
  const afterTouch = await page.evaluate(() => {
    const state = window.__harness.state()
    return [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(entry => entry.id?.startsWith('card-'))
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))
      .map(entry => state.cards[entry.id]?.sessionId)
  })
  check('活跃会话被提到开头', afterTouch[0] === 's5', `${JSON.stringify(beforeTouch.slice(0, 2))} → ${JSON.stringify(afterTouch.slice(0, 2))}`)

  // ---- 6. resize reflows / delete compacts -----------------------------
  const handle = await page.evaluate(() => {
    const el = document.querySelector('[data-talkmap-workspace="ws-daily"] [class*="wsFrameResizeE"]')
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  const shownBefore = await page.evaluate(() => document.querySelectorAll('.react-flow__node[data-id^="card-"]:not([style*="display: none"])').length)
  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(handle.x + i * 34, handle.y)
  await page.mouse.up()
  await page.waitForTimeout(700)
  const grown = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(entry => entry.id?.startsWith('card-'))
    const minTop = Math.min(...cards.map(entry => entry.r.y))
    return cards.filter(entry => Math.abs(entry.r.y - minTop) < 2).length
  })
  check('拉宽后一行装下更多卡片', grown >= 3, `一行 ${grown} 张（拉宽前可见 ${shownBefore} 张）`)

  const firstCard = await page.evaluate(() => {
    const state = window.__harness.state()
    const entry = [...document.querySelectorAll('.react-flow__node')]
      .map(el => ({ id: el.getAttribute('data-id'), r: el.getBoundingClientRect() }))
      .filter(item => item.id?.startsWith('card-'))
      .sort((a, b) => (a.r.y - b.r.y) || (a.r.x - b.r.x))[0]
    return { id: entry.id, session: state.cards[entry.id]?.sessionId, x: entry.r.x + 60, y: entry.r.y + 16 }
  })
  await page.mouse.click(firstCard.x, firstCard.y)
  await page.waitForTimeout(150)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(700)
  const countAfterDelete = await page.evaluate(() => window.__harness.posts.filter(p => p.path.includes('cards/delete')).length)
  check('删卡会落盘（删除请求发出）', countAfterDelete >= 1, `${countAfterDelete} 次 delete 请求`)

  // ---- 7. double-click a folder → new chat there, with a mode ----------
  const frames = await page.evaluate(() => window.__harness.nodeBoxes().frames)
  const medkit = frames['ws-medkit']
  const daily = frames['ws-daily']
  const clickX = Math.max(medkit.x + 60, daily.x + daily.w + 30)
  await page.mouse.dblclick(clickX, medkit.y + medkit.h - 22)
  await page.waitForTimeout(500)
  const draft = await page.evaluate(() => {
    const el = document.querySelector('[class*="tm_draftCard"]')
    if (!el) return null
    return {
      workspace: el.querySelector('select')?.value,
      modes: [...el.querySelectorAll('[role="radio"]')].map(b => b.textContent.trim()),
    }
  })
  check('双击工作区 = 在该工作区新建对话', draft?.workspace === 'ws-medkit', `workspace=${draft?.workspace}`)
  check('草稿卡有模式选择（标准/创造）', (draft?.modes.length ?? 0) === 2, JSON.stringify(draft?.modes))
  await page.evaluate(() => {
    const chip = [...document.querySelectorAll('[role="radio"]')].find(b => b.textContent.includes('创造'))
    chip?.click()
  })
  await page.click('[class*="tm_draftTextarea"]')
  await page.keyboard.type('探针：创造模式')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(600)
  const started = await page.evaluate(() => window.__harness.log.filter(e => e.kind === 'ui.startSession').at(-1))
  check('发送时带上所选模式', started?.detail?.options?.agentPreset === 'cordis', JSON.stringify(started?.detail))
  check('发送后离开面板回到对话', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === null)

  // ---- 8. no runtime errors -------------------------------------------
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
