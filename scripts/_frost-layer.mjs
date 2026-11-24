import fs from 'node:fs'
// 1) StatusRail：面板宽度内加一层磨砂底
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('statusRailFrost')) {
    t = t.replace(
      `      <div className={styles['statusRailPanel']} aria-hidden={!open} ref={panelRef}>`,
      `      {/* The frosted layer lives outside the panel: a backdrop-filter nested under the panel
          had nothing to blur, while this one sits straight on the canvas. */}
      <div className={styles['statusRailFrost']} aria-hidden="true" data-open={open ? '1' : '0'} />
      <div className={styles['statusRailPanel']} aria-hidden={!open} ref={panelRef}>`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('TSX: 加磨砂层')
  }
}
// 2) CSS：磨砂层铺在画布上，卡片叠在上面
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('.statusRailFrost {')) {
    t += `
/* A strip of frost sitting directly on the canvas, behind the cards. It is a sibling of the panel
   (not a child) so its backdrop-filter actually sees the map. */
.statusRailFrost {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--rail-w);
  z-index: 0;
  pointer-events: none;
  backdrop-filter: blur(14px) saturate(1.12);
  -webkit-backdrop-filter: blur(14px) saturate(1.12);
  transform: translateX(-101%);
  transition: transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
  border-radius: 0 20px 20px 0;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 0 26px rgba(255, 255, 255, 0.05),
    inset 0 0 64px rgba(255, 255, 255, 0.02);
}

.statusRailFrost[data-open="1"] {
  transform: translateX(0);
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: 磨砂层样式')
  }
}
