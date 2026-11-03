import fs from 'node:fs'
const file = 'scripts/_status-rail-check3.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace("  dragMoved = after.rows[0]?.title === before[1] && stored !== null", "  dragMoved = after.rows[0]?.title === before[1] && stored !== null\n  var dragDebug = { before, afterFirst: after.rows[0]?.title, stored }")
text = text.replace("  dragMoved,", "  dragMoved,\n  dragDebug,")
text = text.replace("  flushLeft: opened.panelLeft === opened.canvasLeft,", "  flushLeft: opened.panelLeft === opened.canvasLeft,\n  panelLeft: opened.panelLeft,\n  canvasLeft: opened.canvasLeft,")
fs.writeFileSync(file, text, 'utf8')
console.log('debug added')
