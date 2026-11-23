import fs from 'node:fs'
const f = 'src/client/liquid-glass.ts'
let t = fs.readFileSync(f, 'utf8')
// 滤镜区域改用 userSpaceOnUse + 像素值（此前 A/B 里只有这种写法产生了位移）
t = t.replace(
  `    filter.setAttribute('x', '0%')
    filter.setAttribute('y', '0%')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')`,
  `    filter.setAttribute('filterUnits', 'userSpaceOnUse')
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', String(element.offsetWidth))
    filter.setAttribute('height', String(element.offsetHeight))`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('滤镜区域改为 userSpaceOnUse + px')
