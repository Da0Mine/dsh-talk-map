import fs from 'node:fs'
// 1) StatusRail：按钮不再挂折射（元素太小取不到背景样本），改为直接引用面板那层的材质
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const start = t.indexOf('  // The handle carries the same glass as the panel')
  if (start < 0) throw new Error('tab effect anchor missing')
  const end = t.indexOf('  }, [open])', start) + '  }, [open])'.length
  t = t.slice(0, start) + t.slice(end + 1)
  t = t.replace("      ref={tabRef}\n", '')
  t = t.replace('  const tabRef = useRef<HTMLButtonElement | null>(null)\n', '')
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 按钮滤镜移除')
}
// 2) CSS：按钮用面板同款材质（白 6% + 1px 亮边），不用模糊也不用滤镜
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `/* Handle: no material of its own. The plugin shipped a "Frosted glass" chip here
   (blur(16px) + 52% fill); that frosted look is what reads as a second surface, so it goes. */
.statusRailTab {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}`,
    `/* Handle: same material as the panel, painted directly.
   The SVG displacement cannot work here — its scale is an absolute 183 px derived from
   thickness 100, and a 30 px wide element has almost no interior for the filter to sample,
   so the result is invisible. A faint white lift plus a 1 px rim reads as the same glass. */
.statusRailTab {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 按钮改为白 6% + 1px 亮边')
}
