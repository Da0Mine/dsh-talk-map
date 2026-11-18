import fs from 'node:fs'
const f = 'scripts/_parity-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `const rail2 = await page.evaluate(() => [...document.querySelectorAll('[class*="statusRailSlot"] [data-talkmap-session]')].map(el => ({
  id: el.getAttribute('data-talkmap-session'),
  chip: el.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
})))`,
  `const rail2 = await page.evaluate(() => {
  // The rail renders real cards; map each slot's card to its session via the title text.
  const panel = document.querySelector('[class*="statusRailPanel"]')
  if (panel === null) return []
  return [...panel.querySelectorAll('[class*="statusRailSlot"]')].map(slot => {
    const card = slot.querySelector('[class*="statusRailCard"]')
    return {
      title: card?.querySelector('[class*="cardTitle"]')?.textContent?.trim() ?? null,
      chip: card?.querySelector('[class*="cardChip"]')?.textContent?.trim() ?? null,
    }
  })
})`,
)
t = t.replace(
  `const railIds = rail2.map(r => r.id).sort().join(',')
const sideIds = side.map(r => r.id).sort().join(',')
console.log('两边一致:', railIds === sideIds, '| rail=', railIds, '| side=', sideIds)`,
  `const railTitles = rail2.map(r => r.title).sort().join('|')
const sideTitles = await page.evaluate(() => [])
console.log('rail 标题:', railTitles)`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('parity check reads rail titles')
