import fs from 'node:fs'
// 1) 按钮不再单独挂滤镜（避免第二层）
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const start = t.indexOf('  // The handle runs the plugin\'s own recipe')
  if (start >= 0) {
    const endMark = '  }, [])'
    const end = t.indexOf(endMark, start)
    t = t.slice(0, start) + t.slice(end + endMark.length + 1)
    t = t.replace("      ref={tabRef}\n", '')
    t = t.replace('  const tabRef = useRef<HTMLButtonElement | null>(null)\n', '')
    fs.writeFileSync(f, t, 'utf8')
    console.log('按钮：撤掉自己的滤镜')
  }
}
// 2) CSS：拼成一整块轮廓
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  const at = t.indexOf('/* Seamless join with whatever sits to the left')
  if (at >= 0) t = t.slice(0, at)
  t += `/* One continuous slab: the panel draws its top/bottom edge, the handle draws top/right/bottom
   and the seam between them stays open, so the outline reads as a single piece of glass with a
   tab on its right. No dividing line, no shadows, no second material. */
.statusRailPanel {
  border-right: none;
  border-top: 1px solid var(--dsw-alias-border-secondary);
  border-bottom: 1px solid var(--dsw-alias-border-secondary);
  border-radius: 0 20px 20px 0;
  box-shadow: none;
}

.statusRailTab {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-secondary);
  border-left: none;
  border-radius: 0 20px 20px 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 面板+按钮共用一条轮廓')
}
