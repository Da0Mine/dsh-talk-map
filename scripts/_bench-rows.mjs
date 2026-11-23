import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const CDP = 9891
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(c=>fs.existsSync(c))
const child=spawn(EDGE,[`--remote-debugging-port=${CDP}`,`--user-data-dir=${path.join(os.tmpdir(),'rows-'+Date.now())}`,'--no-first-run','--headless=new','about:blank'],{stdio:'ignore'})
let ready=false; const t0=Date.now()
while(Date.now()-t0<20000&&!ready){ try{ ready=(await fetch(`http://127.0.0.1:${CDP}/json/version`)).ok }catch{}; if(!ready) await new Promise(r=>setTimeout(r,200)) }
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const page=await browser.contexts()[0].newPage()
await page.goto('http://127.0.0.1:8793/demo/index.html?demo=1')
await page.waitForTimeout(800)
const out = await page.evaluate(() => {
  const N = 3562
  const ids = Array.from({ length: N }, (_, i) => `sess-${i}`)
  const byId = {}
  for (let i = 0; i < N; i += 1) byId[ids[i]] = { displayTitle: `会话 ${i}`, blank: i % 50 === 0, origin: 'user', updatedAt: 1700000000000 + i, running: i % 997 === 0 }
  const statusById = new Map()
  for (let i = 0; i < 12; i += 1) statusById.set(ids[i * 7], { running: i % 3 === 0, completionUnread: i % 3 === 1 })
  const alerts = new Set([ids[3]])
  const finished = new Map([[ids[11], true]])
  const drafts = { [ids[5]]: '草稿' }
  const opened = new Set()
  const archived = new Set()

  const lampOf = (id, status, summary) => {
    if (alerts.has(id)) return 'error'
    if (status?.pendingInteraction !== undefined) return 'waiting'
    if (status?.running === true || summary?.running === true) return 'running'
    const isMain = (summary?.retainedBy?.mainView ?? 0) > 0
    if (!isMain && (status?.completionUnread === true || finished.has(id))) return 'done'
    return undefined
  }
  const rowsNow = () => {
    const out = []
    for (const sessionId of ids) {
      const summary = byId[sessionId]
      if (summary === undefined) continue
      if (summary.blank === true) continue
      if (summary.origin === 'subagent') continue
      if (archived.has(sessionId)) continue
      const lamp = lampOf(sessionId, statusById.get(sessionId), summary)
      const draftText = drafts[sessionId]
      const hasDraft = draftText !== undefined && draftText.trim() !== ''
      if (lamp === undefined && !hasDraft) continue
      if (lamp === 'done' && opened.has(sessionId)) continue
      out.push({ sessionId, lamp, draftText, updatedAt: summary.updatedAt })
    }
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return out
  }
  const rowsNarrow = () => {
    const out = []
    const candidates = new Set([...statusById.keys(), ...Object.keys(drafts), ...alerts, ...finished.keys()])
    for (const sessionId of candidates) {
      const summary = byId[sessionId]
      if (summary === undefined) continue
      const lamp = lampOf(sessionId, statusById.get(sessionId), summary)
      const draftText = drafts[sessionId]
      const hasDraft = draftText !== undefined && draftText.trim() !== ''
      if (lamp === undefined && !hasDraft) continue
      out.push({ sessionId, lamp, draftText, updatedAt: summary.updatedAt })
    }
    out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    return out
  }
  const time = (fn, runs = 12) => {
    const samples = []
    for (let i = 0; i < runs; i += 1) { const s = performance.now(); fn(); samples.push(performance.now() - s) }
    samples.sort((a, b) => a - b)
    return { median: Math.round(samples[Math.floor(samples.length / 2)] * 100) / 100, worst: Math.round(samples[samples.length - 1] * 100) / 100, rows: fn().length }
  }
  return { full: time(rowsNow), narrow: time(rowsNarrow) }
})
console.log(JSON.stringify(out, null, 1))
await page.close(); await browser.close(); child.kill()
