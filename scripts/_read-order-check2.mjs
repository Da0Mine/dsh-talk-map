import fs from 'node:fs'
const f = 'scripts/_read-order-check.mjs'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(`history: { s3: now - 90000, s5: now - 80000 }`, `history: { s3: now - 90000, s4: now - 85000, s5: now - 80000, s7: now - 75000 }`)
t = t.replace(`await run({ s3: now - 50000, s5: now - 10000 }, '先看 s3 再看 s5 → 期望 s5 在顶:')`,
  `await run({ s3: now - 40000, s4: now - 10000, s5: now - 30000, s7: now - 20000 }, '最后看 s4 → 期望 s4 在顶:')`)
t = t.replace(`await run({ s3: now - 10000, s5: now - 50000 }, '先看 s5 再看 s3 → 期望 s3 在顶:')`,
  `await run({ s3: now - 10000, s4: now - 40000, s5: now - 20000, s7: now - 30000 }, '最后看 s3 → 期望 s3 在顶:')`)
t = t.replace(/const dbg = await page.evaluate[\s\S]*?console.log\('板上的卡:', JSON.stringify\(dbg.cards\)\)\n/, '')
fs.writeFileSync(f, t, 'utf8')
console.log('改成四张卡的对照实验')
