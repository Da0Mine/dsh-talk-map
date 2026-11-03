import fs from 'node:fs'
const file = 'scripts/_status-rail-check2.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  "  const panelRect = panel === null ? null : panel.getBoundingClientRect()",
  "  const canvas = document.querySelector('[class*=\"tm_canvas\"]')\n  const canvasRect = canvas === null ? null : canvas.getBoundingClientRect()\n  const panelRect = panel === null ? null : panel.getBoundingClientRect()",
)
text = text.replace(
  "    panelLeft: panelRect === null ? null : Math.round(panelRect.left),",
  "    panelLeft: panelRect === null ? null : Math.round(panelRect.left),\n    canvasLeft: canvasRect === null ? null : Math.round(canvasRect.left),",
)
text = text.replace(
  "const flushLeft = opened.panelLeft === 0",
  "const flushLeft = opened.panelLeft !== null && opened.canvasLeft !== null && opened.panelLeft === opened.canvasLeft",
)
text = text.replace("  panelLeft: opened.panelLeft,", "  panelLeft: opened.panelLeft,\n  canvasLeft: opened.canvasLeft,")
fs.writeFileSync(file, text, 'utf8')
console.log('flush metric uses the canvas edge')
