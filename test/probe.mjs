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
const edgeArgs = [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-sync',
  '--window-size=1600,1000',
  ...(headed ? [] : ['--headless=new']),
  'about:blank',
]
const edge = spawn(EDGE, edgeArgs, { stdio: 'ignore', detached: false })

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
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(ROOT, 'test/shots/probe-initial.png') })

  // ---- 1. header: back at the left, close at the right, nothing else -----
  const header = await page.evaluate(() => {
    const box = el => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: el.textContent.trim() }
    }
    const headerEl = document.querySelector('[class*="tm_header"]')
    return {
      back: box(document.querySelector('[class*="tm_backButton"]')),
      close: box(document.querySelector('[class*="tm_closeButton"]')),
      title: document.querySelector('[class*="headerTitle"]') !== null,
      text: headerEl?.textContent.trim(),
    }
  })
  check('左上角是返回按钮', header.back !== null && header.back.text.includes('返回'), JSON.stringify(header.back))
  check('右上角有关闭按钮', header.close !== null, JSON.stringify(header.close))
  check('按钮放大了（≥34px 高）', (header.back?.h ?? 0) >= 34 && (header.close?.h ?? 0) >= 34, `back ${header.back?.h}px / close ${header.close?.h}px`)
  check('标题文字已删除', header.title === false, `header text: ${header.text}`)

  // ---- 2. layout: no overlap, newest first ------------------------------
  const layout = await page.evaluate(() => {
    const cards = []
    for (const el of document.querySelectorAll('.react-flow__node')) {
      const id = el.getAttribute('data-id')
      if (!id || id.startsWith('frame-') || id === 'draft') continue
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
    // The mock's session ids, sorted by recency, mapped to the card that shows them.
    const state = window.__harness.state()
    const cardOf = {}
    for (const [cardId, card] of Object.entries(state.cards)) cardOf[card.sessionId] = cardId
    const dailyOrder = cards
      .filter(c => ['card-1', 'card-2', 'card-3', 'card-4', 'card-5'].includes(c.id))
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .map(c => state.cards[c.id].sessionId)
    return { count: cards.length, overlaps, dailyOrder }
  })
  check('卡片互不重叠', layout.overlaps.length === 0, `${layout.count} 张卡，重叠 ${layout.overlaps.length} 对`)
  // s1 2m, s2 15m, s5 40m, s3 90m, s4 240m → newest first is exactly this order.
  const expected = ['s1', 's2', 's5', 's3', 's4']
  check('对话按时间倒序排（最新的在左/上）', JSON.stringify(layout.dailyOrder) === JSON.stringify(expected), `实际 ${JSON.stringify(layout.dailyOrder)}`)
  const rowsOk = await page.evaluate(() => {
    const daily = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5']
    const boxes = daily
      .map(id => {
        const el = document.querySelector(`.react-flow__node[data-id="${id}"]`)
        if (el === null) return null
        const r = el.getBoundingClientRect()
        return { top: Math.round(r.top), left: Math.round(r.left) }
      })
      .filter(box => box !== null)
      .sort((a, b) => (a.top - b.top) || (a.left - b.left))
    if (boxes.length < 5) return false
    return new Set(boxes.slice(0, 3).map(box => box.top)).size === 1
      && boxes.slice(3).every(box => box.top > boxes[0].top)
  })
  check('行优先：最新的三个在第一行，其余换行', rowsOk === true)

  // ---- 3. lamps: running = white, done = green --------------------------
  const lamps = await page.evaluate(() => {
    const read = sessionId => {
      const card = Object.values(window.__harness.state().cards).find(c => c.sessionId === sessionId)
      const el = [...document.querySelectorAll('.react-flow__node')].find(node => window.__harness.state().cards[node.getAttribute('data-id')]?.sessionId === sessionId)
      if (!el) return null
      const inner = el.querySelector('[class*="tm_card"]') ?? el.firstElementChild
      const style = getComputedStyle(inner)
      return { animation: style.animationName, shadow: style.boxShadow }
    }
    return { running: read('s1'), done: read('s3') }
  })
  check('运行中 = 白光呼吸', (lamps.running?.animation ?? '').includes('lamp-white'), lamps.running?.animation)
  check('已完成 = 绿光', (lamps.done?.shadow ?? '').includes('52, 199, 89'), (lamps.done?.shadow ?? '').slice(0, 60))

  // ---- 4. panel model: hotkey opens the main panel, back closes it -----
  const panelOpen = await page.evaluate(() => window.__harness.panelState())
  check('地图是 main 面板（不是全覆盖遮罩）', panelOpen.selectedPanel === 'talk-map', JSON.stringify(panelOpen))
  await page.click('[class*="tm_backButton"]')
  await page.waitForTimeout(400)
  const afterBack = await page.evaluate(() => ({
    panel: window.__harness.panelState(),
    placeholder: document.querySelector('[data-harness-placeholder]') !== null,
  }))
  check('返回按钮回到对话（取消选中面板）', afterBack.panel.selectedPanel === null && afterBack.placeholder, JSON.stringify(afterBack.panel))
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true })))
  await page.waitForTimeout(500)
  check('快捷键重新打开面板', (await page.evaluate(() => window.__harness.panelState())).selectedPanel === 'talk-map')

  // ---- 5. resize reflows, delete compacts ------------------------------
  const beforeResize = await page.evaluate(() => window.__harness.nodeBoxes())
  const handle = await page.evaluate(() => {
    const el = document.querySelector('[data-talkmap-workspace="ws-daily"] [class*="wsFrameResizeE"]')
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(handle.x + i * 30, handle.y)
  await page.mouse.up()
  await page.waitForTimeout(700)
  const afterResize = await page.evaluate(() => window.__harness.nodeBoxes())
  const topRowWidth = (boxes) => {
    const daily = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5']
      .map(id => boxes.cards[id])
      .filter(Boolean)
    const minTop = Math.min(...daily.map(box => box.y))
    return daily.filter(box => box.y === minTop).length
  }
  const colsBefore = topRowWidth(beforeResize)
  const colsAfter = topRowWidth(afterResize)
  check('拉宽工作区后卡片重排（一行装下更多）', colsAfter > colsBefore, `一行 ${colsBefore} 张 → ${colsAfter} 张`)
  await page.screenshot({ path: path.join(ROOT, 'test/shots/probe-resized.png') })

  const targetCard = await page.evaluate(() => window.__harness.nodeBoxes().cards['card-4'])
  await page.mouse.click(targetCard.x + 60, targetCard.y + 16)
  await page.waitForTimeout(150)
  await page.keyboard.press('Delete')
  await page.waitForTimeout(700)
  const afterDelete = await page.evaluate(() => Object.keys(window.__harness.nodeBoxes().cards))
  check('删掉卡片后其他人补位（卡数减一）', afterDelete.length === 7, `${afterDelete.length} 张卡`)

  // ---- 6. double-click inside a folder → new chat there, with a mode ----
  const frames = await page.evaluate(() => window.__harness.nodeBoxes().frames)
  const medkit = frames['ws-medkit']
  const daily = frames['ws-daily']
  // A point inside MedKit's own box but outside the (now widened) daily folder,
  // so the probe cannot be fooled by overlapping folders.
  const clickX = Math.max(medkit.x + 120, daily.x + daily.w + 40)
  const clickY = medkit.y + medkit.h - 25
  await page.mouse.dblclick(clickX, clickY)
  await page.waitForTimeout(500)
  const draft = await page.evaluate(() => {
    const el = document.querySelector('[class*="tm_draftCard"]')
    if (!el) return null
    const select = el.querySelector('select')
    return {
      workspace: select?.value,
      modes: [...el.querySelectorAll('[role="radio"]')].map(b => ({ text: b.textContent.trim(), checked: b.getAttribute('aria-checked') })),
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

  // ---- 7. no runtime errors --------------------------------------------
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
