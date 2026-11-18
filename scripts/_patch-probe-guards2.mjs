/** probe.mjs guards, applied by line index (string anchors were brittle). */
import fs from 'node:fs'
import net from 'node:net'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')

if (lines.some(l => l.includes('refusing to attach to a foreign browser'))) {
  console.log('guards already installed')
  process.exit(0)
}

// 1) port-taken check right after the EDGE existence check
const edgeAt = lines.findIndex(l => l.includes("throw new Error('Microsoft Edge not found')"))
if (edgeAt < 0) throw new Error('EDGE check line missing')
lines.splice(edgeAt + 1, 0,
  '// A browser already listening on our CDP port means we would drive SOMEONE ELSE\'S window',
  '// (that is how the DSH app got navigated to the probe page and crashed). Refuse instead.',
  '{',
  '  const taken = await new Promise((resolve) => {',
  '    const socket = new net.Socket()',
  '    socket.setTimeout(600)',
  '    socket.once(\'connect\', () => { socket.destroy(); resolve(true) })',
  '    socket.once(\'timeout\', () => { socket.destroy(); resolve(false) })',
  '    socket.once(\'error\', () => resolve(false))',
  '    socket.connect(CDP, \'127.0.0.1\')',
  '  })',
  '  if (taken) {',
  '    throw new Error(`CDP port ${CDP} is already in use — refusing to attach to a foreign browser`)',
  '  }',
  '}',
)

// 2) browser identity check after waitForCdp()
const versionAt = lines.findIndex(l => l.includes('const version = await waitForCdp()'))
if (versionAt < 0) throw new Error('waitForCdp line missing')
lines.splice(versionAt + 1, 0,
  '  if (typeof version.Browser !== \'string\' || !version.Browser.startsWith(\'Edg/\')) {',
  '    throw new Error(`refusing to drive ${String(version.Browser)} — this probe only drives its own Edge`)',
  '  }',
)

// 3) fresh page + app guard, replacing pages()[0]
const pageAt = lines.findIndex(l => l.includes('const page = context.pages()[0] ?? await context.newPage()'))
if (pageAt < 0) throw new Error('pages()[0] line missing')
lines[pageAt] = [
  '  // Never reuse pages()[0]: with a stray browser that page IS the user\'s window.',
  '  const page = await context.newPage()',
  '  if (!page.url().startsWith(\'about:\')) {',
  '    throw new Error(`new probe page is ${page.url()} — expected about:blank, aborting`)',
  '  }',
  '  {',
  '    const looksLikeApp = await page.evaluate(() => (',
  '      location.port === \'38373\'',
  '      || location.href.startsWith(\'dsh-app://\')',
  '      || typeof window.__DSH_BOOT__ !== \'undefined\'',
  '    )).catch(() => false)',
  '    if (looksLikeApp) throw new Error(\'this page is the running DSH app — probe refuses to drive it\')',
  '  }',
].join('\n')

// net 需要 import
const importAt = lines.findIndex(l => l.startsWith("import http from 'node:http'"))
if (importAt >= 0 && !lines.some(l => l.startsWith("import net from 'node:net'"))) {
  lines.splice(importAt, 0, "import net from 'node:net'")
}

fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('probe guards installed')

// 端口检查逻辑自测（不启动任何浏览器）
const probePort = (port) => new Promise((resolve) => {
  const socket = new net.Socket()
  socket.setTimeout(600)
  socket.once('connect', () => { socket.destroy(); resolve(true) })
  socket.once('timeout', () => { socket.destroy(); resolve(false) })
  socket.once('error', () => resolve(false))
  socket.connect(port, '127.0.0.1')
})
console.log('连接自测 9333 (应为 false):', await probePort(9333))
console.log('连接自测 38373 (应为 true，即 DSH):', await probePort(38373))
