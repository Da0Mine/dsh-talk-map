/**
 * 演示页自测：无头 Edge 打开 demo/index.html，统计元素、点抽屉、搜关键词，截图。
 *   node demo/test.mjs
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):/, '$1:')))
const SHOTS = path.join(ROOT, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(f => fs.existsSync(f))
const profile = path.join(os.tmpdir(), 'talkmap-demo-test')
fs.rmSync(profile, { recursive: true, force: true })
const edge = spawn(EDGE, [
  '--remote-debugging-port=9367', `--user-data-dir=${profile}`,
  '--no-first-run', '--headless=new', '--window-size=1600,1000', 'about:blank',
], { stdio: 'ignore' })

;(async () => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try { const r = await fetch('http://127.0.0.1:9367/json/version'); if (r.ok) break } catch { /* wait */ }
    await new Promise(r => setTimeout(r, 200))
  }
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9367')
  const context = browser.contexts()[0] ?? await browser.newContext()
  const page = context.pages()[0] ?? await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/'))
  await page.waitForTimeout(1500)

  const stats = await page.evaluate(() => ({
    cards: document.querySelectorAll('.card').length,
    frames: document.querySelectorAll('.frame').length,
    edges: document.querySelectorAll('#wires path.edge').length,
    lamps: document.querySelectorAll('[class*="lamp-"]').length,
  }))
  await page.screenshot({ path: path.join(SHOTS, 'open.png') })

  const badge = await page.$('.stackbadge')
  if (badge) {
    await badge.click()
    await page.waitForTimeout(800)
    stats.drawerCards = await page.evaluate(() => document.querySelectorAll('[data-stack-card]').length)
    await page.screenshot({ path: path.join(SHOTS, 'drawer.png') })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }

  await page.fill('#gsInput', '插件')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  stats.gsHits = await page.evaluate(() => document.querySelectorAll('.gshit').length)
  await page.screenshot({ path: path.join(SHOTS, 'search.png') })

  console.log(JSON.stringify(stats))
  console.log('errors:', errors.length ? errors.join(' | ').slice(0, 600) : 'none')
  await browser.close()
  edge.kill()
  process.exit(errors.length ? 1 : 0)
})().catch(e => { console.error('FAIL', e.message); edge.kill(); process.exit(1) })
