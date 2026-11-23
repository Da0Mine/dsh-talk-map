import fs from 'node:fs'
// 1) StatusRail：撤掉按钮的 JS 玻璃，回到 0.3.3 的纯 CSS 按钮
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const start = t.indexOf('  // The handle only carries its own glass')
  const startAlt = start < 0 ? t.indexOf('  // Same material as the panel; the specular band') : start
  if (startAlt >= 0) {
    const endMark = "  }, [open])"
    const end = t.indexOf(endMark, startAlt)
    if (end < 0) throw new Error('tab effect end not found')
    t = t.slice(0, startAlt) + t.slice(end + endMark.length + 1)
  }
  t = t.replace("      ref={tabRef}\n", '')
  t = t.replace('  const tabRef = useRef<HTMLButtonElement | null>(null)\n', '')
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 按钮回退到纯 CSS（0.3.3 状态）')
}
// 2) CSS：面板去掉右边框与外投影，和左侧接成一体
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('.statusRailPanel {\n  border-right: none;')) {
    t += `
/* Seamless join with whatever sits to the left: no dividing line, no drop shadow. */
.statusRailPanel {
  border-right: none;
  box-shadow: none;
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 面板去边框/去投影')
  }
}
