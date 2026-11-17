import fs from 'node:fs'
const file = 'src/client/MapToggleButton.tsx'
let t = fs.readFileSync(file, 'utf8')

// 1) 外层：wide 时用内联样式强制 column（不依赖 CSS 类是否被覆盖）
t = t.replace(
  `    <div className={\`\${styles['toggleWrap']}\${wide ? \` \${styles['toggleWrapWide']}\` : ''}\`}>`,
  `    <div
      className={\`\${styles['toggleWrap']}\${wide ? \` \${styles['toggleWrapWide']}\` : ''}\`}
      // The host puts footer entries in a ROW (.footerActions{display:flex}) whose parent
      // centres them (.footArea{align-items:center}) — with a plain class the queue ended up
      // beside the buttons and the buttons floated mid-height. Inline styles win regardless
      // of which CSS survived in the installed copy.
      style={wide ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, width: '100%', minWidth: 0, flex: '1 1 100%' } : undefined}
    >`,
)

// 2) 控制行同样内联钉住
t = t.replace(
  `      <div className={styles['toggleControls']}>`,
  `      <div
        className={styles['toggleControls']}
        style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}
      >`,
)
fs.writeFileSync(file, t, 'utf8')
console.log('MapToggleButton: inline column layout')

// 3) 队列块与列表：内联撑满 + 内部滚动
const sq = 'src/client/SidebarQueue.tsx'
let s = fs.readFileSync(sq, 'utf8')
s = s.replace(
  `    <div className={styles['sidebarQueue']} lang={locale} data-talkmap-queue-root="1">`,
  `    <div
      className={styles['sidebarQueue']}
      lang={locale}
      data-talkmap-queue-root="1"
      style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, minHeight: 0, maxHeight: '46vh', overflow: 'hidden', flex: '1 1 auto' }}
    >`,
)
s = s.replace(
  `      <div className={styles['sidebarQueueList']} role="list">`,
  `      <div
        className={styles['sidebarQueueList']}
        role="list"
        style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '0 4px 6px', overscrollBehavior: 'contain' }}
      >`,
)
s = s.replace(
  `              className={\`\${styles['card']} \${styles[LAMP_CLASS[row.lamp]] ?? ''} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}`,
  `              className={\`\${styles['card']} \${styles[LAMP_CLASS[row.lamp]] ?? ''} \${styles['statusRailCard']} \${styles['sidebarQueueCard']}\`}
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', flex: 'none', alignSelf: 'stretch' }}`,
)
fs.writeFileSync(sq, s, 'utf8')
console.log('SidebarQueue: inline width/scroll')
