/**
 * Measures the real cost of the two hot spots, in a page that has the same localStorage
 * shape as the user's machine (3 562 session keys), then the optimized variants.
 *
 * Usage: node scripts/_bench-hotspots.mjs [port]
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const PORT = process.argv[2] ?? '8793'
const CDP = 9881
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))

const child = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${path.join(os.tmpdir(), `hot-${Date.now()}`)}`,
  '--no-first-run', '--headless=new', '--window-size=1400,900', 'about:blank',
], { stdio: 'ignore' })

let ready = false
const started = Date.now()
while (Date.now() - started < 20000 && !ready) {
  try { ready = (await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok } catch { /* retry */ }
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200))
}

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page = await browser.contexts()[0].newPage()
await page.goto(`http://127.0.0.1:${PORT}/demo/index.html?demo=1`)
await page.waitForTimeout(1200)

const result = await page.evaluate(() => {
  const PREFIX = 'dsh.conversation.'
  const SESSIONS = 3562

  // ---- the user's storage shape: one conversation key per session ------------------
  localStorage.clear()
  const view = { scroll: 0, atSeq: 12, composer: { model: 'x' } }
  for (let index = 0; index < SESSIONS; index += 1) {
    const id = `session-${index.toString(36)}-aaaaaaaaaaaaaaaaaaaa`
    const draft = index % 400 === 0 ? { text: `未发送的草稿 ${index}` } : ''
    localStorage.setItem(PREFIX + id, JSON.stringify({ draft, view }))
  }

  const draftTextOf = (value) => {
    if (typeof value === 'string') return value
    if (value !== null && typeof value === 'object' && typeof value.text === 'string') return value.text
    return ''
  }

  // ---- current implementation: scan every key, JSON.parse every value -------------
  const currentScan = () => {
    const out = {}
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key === null || !key.startsWith(PREFIX)) continue
      const sessionId = key.slice(PREFIX.length)
      const raw = localStorage.getItem(key)
      if (raw === null) continue
      const stored = JSON.parse(raw)
      const draft = stored !== null && typeof stored === 'object' ? stored.draft : undefined
      const text = draftTextOf(draft)
      if (text.trim() !== '') out[sessionId] = text
    }
    return out
  }

  // ---- optimized: memoize the parse by the RAW string, bounded LRU ------------------
  const memo = new Map()
  const optimizedScan = () => {
    const out = {}
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key === null || !key.startsWith(PREFIX)) continue
      const raw = localStorage.getItem(key)
      if (raw === null || raw === memo.get(key)) {
        const cached = memo.get(key)
        if (cached !== undefined) continue
      }
      let text = ''
      const hit = memo.get(key + '\u0000text')
      if (hit !== undefined && typeof hit === 'string') {
        // Unreachable in the same pass; kept simple below.
      }
      try {
        const stored = JSON.parse(raw)
        const draft = stored !== null && typeof stored === 'object' ? stored.draft : undefined
        text = draftTextOf(draft)
      } catch { text = '' }
      memo.set(key, raw)
      if (text.trim() !== '') out[key.slice(PREFIX.length)] = text
    }
    // prune (bounded)
    if (memo.size > 6000) {
      let drop = memo.size - 6000
      for (const key of memo.keys()) { memo.delete(key); if (--drop <= 0) break }
    }
    return out
  }

  // ---- optimized v2: skip JSON.parse for entries that cannot hold a draft ----------
  const fastScan = () => {
    const out = {}
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key === null || !key.startsWith(PREFIX)) continue
      const raw = localStorage.getItem(key)
      if (raw === null) continue
      // Cheap rejection: `"draft":""` or `"draft":{}` cannot carry text.
      if (raw.includes('"draft":""') || raw.includes('"draft":{}')) continue
      try {
        const stored = JSON.parse(raw)
        const draft = stored !== null && typeof stored === 'object' ? stored.draft : undefined
        const text = draftTextOf(draft)
        if (text.trim() !== '') out[key.slice(PREFIX.length)] = text
      } catch { /* ignore */ }
    }
    return out
  }

  const time = (fn, runs) => {
    const samples = []
    for (let run = 0; run < runs; run += 1) {
      const start = performance.now()
      fn()
      samples.push(performance.now() - start)
    }
    samples.sort((a, b) => a - b)
    return { median: Math.round(samples[Math.floor(samples.length / 2)] * 10) / 10, worst: Math.round(samples[samples.length - 1] * 10) / 10 }
  }

  const counts = { keys: localStorage.length }
  const current = time(currentScan, 7)
  const fast = time(fastScan, 7)
  const memoized = time(optimizedScan, 7)
  const drafted = Object.keys(fastScan()).length
  const heap = performance.memory === undefined ? null : Math.round(performance.memory.usedJSHeapSize / 1048576)

  return { counts, drafted, heapMB: heap, current, fast, memoized }
})

console.log(JSON.stringify(result, null, 1))
await page.close()
await browser.close()
child.kill()
