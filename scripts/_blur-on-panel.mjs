import fs from 'node:fs'
// 1) 去掉无效的磨砂子元素
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const before = `      {/* The frosted layer lives outside the panel: a backdrop-filter nested under the panel
          had nothing to blur, while this one sits straight on the canvas. */}
      <div className={styles['statusRailFrost']} aria-hidden="true" data-open={open ? '1' : '0'} />
`
  if (t.includes(before)) {
    t = t.replace(before, '')
    fs.writeFileSync(f, t, 'utf8')
    console.log('TSX: 移除磨砂子元素')
  }
}
// 2) 模糊放回面板本身；卡片只保留半透明
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `.statusRailPanel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}`,
    `.statusRailPanel {
  /* Blur belongs on the panel: its own backdrop-filter does render, while a nested one inside a
     child has nothing to sample. Cards stay translucent and float on this frosted column. */
  backdrop-filter: blur(14px) saturate(1.12);
  -webkit-backdrop-filter: blur(14px) saturate(1.12);
}`,
  )
  t = t.replace(
    `  backdrop-filter: blur(10px) saturate(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(1.15);
}`,
    `}`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 面板 blur(14px)，卡片去掉无效的 backdrop-filter')
}
