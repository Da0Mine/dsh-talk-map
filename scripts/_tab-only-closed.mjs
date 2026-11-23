import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
const before = `  // The handle that opens the rail gets the same material.
  useEffect(() => {
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element)
  }, [])`
const after = `  // The handle only carries its own glass while the rail is closed. Open, the panel is the
  // single surface — otherwise the two rounded layers overlap at the seam.
  useEffect(() => {
    if (open) return undefined
    const element = tabRef.current
    if (element === null) return undefined
    return installLiquidGlass(element)
  }, [open])`
if (!t.includes(before)) throw new Error('tab effect anchor missing')
t = t.replace(before, after)
fs.writeFileSync(f, t, 'utf8')
console.log('把手：仅关闭态挂玻璃')
