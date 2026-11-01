/** Patch demo/capture.mjs: ignore the info console line, widen frame selectors. */
import fs from 'node:fs'

const file = 'demo/capture.mjs'
let source = fs.readFileSync(file, 'utf8')
const before = source

source = source.replace(
  "page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })",
  "page.on('console', m => {\n  // The harness logs one info line through console.error on boot; it is not a page fault.\n  if (m.type() === 'error' && !m.text().includes('client bundle evaluated')) errors.push(m.text())\n})",
)
source = source.replace(
  '  frames: document.querySelectorAll(\'[class*="tm_frame"]\').length,',
  '  frames: document.querySelectorAll(\'[class*="frame"]\').length,',
)
source = source.replace(
  '  titles: [...document.querySelectorAll(\'[class*="tm_frame"] [class*="label"], [class*="tm_frameLabel"]\')].map(n => n.textContent.trim()).slice(0, 8),',
  '  frameTexts: [...document.querySelectorAll(\'[class*="frame"]\')].slice(0, 6).map(n => n.textContent.trim().slice(0, 24)),',
)
source = source.replace(
  '  lamps: document.querySelectorAll(\'[class*="cardLamp"]\').length,',
  '  lamps: document.querySelectorAll(\'[class*="Lamp"], [class*="lamp"]\').length,',
)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('capture patched')
