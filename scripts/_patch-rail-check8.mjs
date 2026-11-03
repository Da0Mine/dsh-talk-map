import fs from 'node:fs'
const file = 'scripts/_status-rail-check3.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace("    open: root === null ? false : root.className.includes('statusRailOpen'),", "    open: root === null ? false : root.getAttribute('data-open') === '1',")
text = text.replace("const boxes = opened.rows.map(row => ({ x: row.left + 60, y: row.top + 20 }))", "const boxes = opened.rows.map(row => ({ x: row.left + 60, y: row.top + 30 }))")
text = text.replace("  await page.mouse.move(boxes[1].x, boxes[1].y - 40, { steps: 6 })\n  await page.mouse.move(boxes[0].x, boxes[0].y, { steps: 10 })", "  await page.waitForTimeout(150)\n  await page.mouse.move(boxes[1].x, boxes[1].y - 40, { steps: 8 })\n  await page.mouse.move(boxes[0].x, boxes[0].y - 20, { steps: 15 })\n  await page.waitForTimeout(250)")
fs.writeFileSync(file, text, 'utf8')
console.log('checker drag follows the working trace')
