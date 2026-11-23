import fs from 'node:fs'
const f = 'src/client/liquid-glass.ts'
let t = fs.readFileSync(f, 'utf8')
t = t.replace("  const blurAmount = options.blurAmount ?? 2", "  // The plugin ships blurAmount: 2; the user wants pure refraction, so no blur at all.\n  const blurAmount = options.blurAmount ?? 0")
fs.writeFileSync(f, t, 'utf8')
console.log('blurAmount 默认 2 → 0')
