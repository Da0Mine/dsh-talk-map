/** Probe: the edge menu must offer the per-edge auto-push switch. */
import fs from 'node:fs'

const file = 'test/probe.mjs'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const at = lines.findIndex(line => line.includes("check('面板不再报「界面服务还在初始化」'"))
if (at < 0) {
  console.error('anchor missing')
  process.exit(1)
}
let end = at
while (end < lines.length && !lines[end].trim().endsWith("String(spawnCalls.error))")) end += 1

const block = [
  '',
  '  // ---- per-edge auto push switch -------------------------------------',
  '  const edgePoint = await page.evaluate(() => {',
  "    const edge = document.querySelector('.react-flow__edge')",
  '    if (edge === null) return null',
  '    const box = edge.getBoundingClientRect()',
  '    if (box.width < 2 || box.height < 2) return null',
  '    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }',
  '  })',
  '  if (edgePoint === null) {',
  "    check('连线右键有「开启自动推送」', false, 'no edge on the board to click')",
  '  } else {',
  '    await page.mouse.click(edgePoint.x, edgePoint.y, { button: \'right\' })',
  '    await page.waitForTimeout(400)',
  '    const edgeMenuItems = await page.evaluate(() => [...document.querySelectorAll(\'[class*="menuItem"]\')].map(node => node.textContent.trim()))',
  "    check('连线右键有「开启自动推送」', edgeMenuItems.some(text => text.includes('自动推送')), JSON.stringify(edgeMenuItems))",
  "    const autoRow = await page.evaluate(() => {",
  "      const rows = [...document.querySelectorAll('[class*=\"menuItem\"]')]",
  "      const row = rows.find(node => node.textContent.includes('自动推送'))",
  '      if (row === undefined) return null',
  '      const box = row.getBoundingClientRect()',
  '      return { x: Math.round(box.x + 30), y: Math.round(box.y + box.height / 2) }',
  '    })',
  '    if (autoRow === null) {',
  "      check('点一下就把这条线设成自动推送', false, 'row missing')",
  '    } else {',
  '      await page.mouse.click(autoRow.x, autoRow.y)',
  '      await page.waitForTimeout(600)',
  '      const stored = await page.evaluate(() => {',
  '        const state = window.__harness.state()',
  '        const edges = Object.values(state.edges ?? {})',
  '        return edges.map(edge => ({ auto: edge?.injection?.autoPush === true }))',
  '      })',
  "      check('点一下就把这条线设成自动推送', stored.some(entry => entry.auto === true), JSON.stringify(stored))",
  '    }',
  '    await page.keyboard.press(\'Escape\')',
  '    await page.waitForTimeout(250)',
  '  }',
]

const next = [...lines.slice(0, end + 1), ...block, ...lines.slice(end + 1)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log('inserted after line', end + 1)
