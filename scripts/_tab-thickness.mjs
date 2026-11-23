import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  'return installLiquidGlass(element, { specularBezel: 6 })',
  `// thickness is what drives the displacement magnitude (panel: 183px, which is fine across
    // 296px but would push a 30px handle completely out of frame). 4 gives ~12px here.
    return installLiquidGlass(element, { thickness: 4, specularBezel: 6 })`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('把手：thickness 4（scale≈12px）')
