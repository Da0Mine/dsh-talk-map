import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  'return installLiquidGlass(element, { scale: 8, specularBezel: 6 })',
  `// The look the handle had before: a 45% fill, a soft 12px frost and an 8px displacement.
    // (The faithful port dropped all three: bgOpacity 0, blur 0, and scale from the formula
    //  which came out at 183px — i.e. nothing left on a 30px wide element.)
    return installLiquidGlass(element, { scale: 8, specularBezel: 6, bgOpacity: 45, blurAmount: 12 })`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('按钮：bg 45% + blur 12 + scale 8')
