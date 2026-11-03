import fs from 'node:fs'
const file = 'scripts/_status-rail-check3.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace("if (!closed.open) await page.click('[class*=\"statusRailTab\"]')", "// The count badge also matches the substring; click the button itself.\nif (!closed.open) await page.click('button[class*=\"statusRailTab\"]')")
text = text.replace("  const tab = document.querySelector('[class*=\"statusRailTab\"]')", "  const tab = document.querySelector('button[class*=\"statusRailTab\"]')")
fs.writeFileSync(file, text, 'utf8')
console.log('selector fixed')
