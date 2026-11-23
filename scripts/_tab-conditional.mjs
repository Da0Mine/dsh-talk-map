import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = `  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element, { specularBezel: 6 })
  }, [])`
const after = `  useEffect(() => {
    // Only while closed: open, the panel is the single surface and the handle is just an icon.
    if (open) return undefined
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element, { specularBezel: 6 })
  }, [open])`
if (!t.includes(before)) throw new Error('tab effect anchor missing')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('把手：仅关闭态挂滤镜')
