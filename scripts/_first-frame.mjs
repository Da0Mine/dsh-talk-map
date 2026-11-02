/** Does the line move between the first frame and the settled frame? */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const EDGE_BIN = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(candidate => fs.existsSync(candidate))
const port = 9491
const child = spawn(EDGE_BIN, [`--remote-debugging-port=${port}`, `--user-data-dir=${path.join(os.tmpdir(), 'ff-' + Date.now())}`,
  '--no-first-run', '--disable-extensions', '--window-size=1700,1050', '--headless=new', 'about:blank'], { stdio: 'ignore' })

let ready = false
const started = Date.now()
while (Date.now() - started < 20000 && !ready) {
  try { ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok } catch { /* not up */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200))
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
const page = browser.contexts()[0].pages()[0] ?? await browser.contexts()[0].newPage()
await page.setViewportSize({ width: 1700, height: 1050 })
const read = () => page.evaluate(() => [...document.querySelectorAll('.react-flow__edge-path')].map(el => el.getAttribute('d')))
await page.goto('file:///' + path.resolve('demo/index.html').replace(/\\/g, '/') + '?demo=1')
await page.waitForTimeout(60)
const early = await read()
await page.waitForTimeout(2500)
const late = await read()
await browser.close()
child.kill()

const stable = JSON.stringify(early) === JSON.stringify(late)
console.log(JSON.stringify({ stable, early: early.length, late: late.length, firstEarly: early[0]?.slice(0, 70), firstLate: late[0]?.slice(0, 70) }, null, 1))
process.exitCode = stable ? 0 : 1
