/**
 * Mount the real TalkMapEdge inside a real React Flow, bundle it, and screenshot
 * it — the only way to prove the component paints (the probe's fixture edge sits
 * on folded cards, so it is filtered out before render).
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const entry = `import { createRoot } from 'react-dom/client'
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import { edgeTypes } from '../src/client/TalkMapEdge.tsx'
import '@xyflow/react/dist/style.css'

const nodes = [
  { id: 'a', position: { x: 60, y: 60 }, data: { label: 'A' }, style: { width: 130, height: 64, background: '#23262d', color: '#cfd6e3', border: '1px solid #333a45', borderRadius: 10 } },
  { id: 'b', position: { x: 460, y: 220 }, data: { label: 'B' }, style: { width: 130, height: 64, background: '#23262d', color: '#cfd6e3', border: '1px solid #333a45', borderRadius: 10 } },
]

const edges = [
  { id: 'sync', source: 'a', target: 'b', type: 'talkMap', data: { sync: 'synced' } },
  { id: 'idle', source: 'b', target: 'a', type: 'talkMap', data: { sync: 'idle' } },
]

createRoot(document.getElementById('root')!).render(
  <div style={{ width: 760, height: 420 }}>
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView proOptions={{ hideAttribution: true }}>
        <Background />
      </ReactFlow>
    </ReactFlowProvider>
  </div>,
)
`

const entryFile = path.join('scripts', '_edge-live-entry.tsx')
fs.writeFileSync(entryFile, entry, 'utf8')

const outDir = path.join('test', 'shots')
fs.mkdirSync(outDir, { recursive: true })
const bundleFile = path.join(outDir, 'edge-live.js')

import * as esbuild from 'esbuild'
await esbuild.build({
  entryPoints: [entryFile],
  bundle: true,
  jsx: 'automatic',
  format: 'iife',
  outfile: bundleFile,
  loader: { '.tsx': 'tsx' },
  logLevel: 'warning',
})
if (!fs.existsSync(bundleFile)) {
  console.error('bundle failed')
  process.exit(1)
}
const html = `<!doctype html>
<meta charset="utf-8" />
<style>
  body { margin: 0; background: #16181d; font-family: system-ui, sans-serif; }
  .react-flow { background: #16181d; }
  .react-flow__node { display: flex; align-items: center; justify-content: center; font-size: 13px; }
</style>
<div id="root"></div>
<link rel="stylesheet" href="edge-live.css" />
<script src="edge-live.js"></script>
`

const pageFile = path.join(outDir, 'edge-live.html')
fs.writeFileSync(pageFile, html, 'utf8')

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(candidate => fs.existsSync(candidate))
const profileDir = path.join(os.tmpdir(), 'talkmap-edge-live')
fs.rmSync(profileDir, { recursive: true, force: true })
const CDP = 9361
const edge = spawn(EDGE, [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--window-size=800,460', '--headless=new', 'about:blank',
], { stdio: 'ignore' })

async function waitForCdp(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP}/json/version`)
      if (response.ok) return await response.json()
    } catch { /* not up yet */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('no CDP')
}

await waitForCdp()
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
const context = browser.contexts()[0] ?? await browser.newContext()
const page = context.pages()[0] ?? await context.newPage()
page.on('pageerror', error => console.log('PAGEERROR', String(error)))
page.on('console', message => {
  if (message.type() === 'error') console.log('CONSOLE', message.text().slice(0, 200))
})
await page.setViewportSize({ width: 800, height: 460 })
await page.goto('file:///' + path.resolve(pageFile).replace(/\\/g, '/'))
await page.waitForTimeout(1200)

const shape = await page.evaluate(() => {
  const groups = [...document.querySelectorAll('.react-flow__edge')]
  return {
    edges: groups.length,
    withMask: groups.filter(group => group.querySelector('mask') !== null).length,
    paths: document.querySelectorAll('.react-flow__edge path').length,
  }
})
console.log('shape:', JSON.stringify(shape))

for (const [index, delay] of [0, 900, 900].entries()) {
  if (delay > 0) await page.waitForTimeout(delay)
  const file = path.join(outDir, `edge-live-${index + 1}.png`)
  await page.screenshot({ path: file })
  console.log('shot:', file)
}

await browser.close()
edge.kill()
