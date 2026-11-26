import fs from 'node:fs'

// ---------- SidebarQueue：最近区真正用上顺序 + 拖拽处理器 ----------
{
  const f = 'src/client/SidebarQueue.tsx'
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  const mapAt = lines.findIndex(line => line.includes('{recentRows.map((row) => ('))
  if (mapAt < 0) throw new Error('recent map not found')
  lines[mapAt] = lines[mapAt].replace('{recentRows.map((row) => (', '{recentRowsOrdered.map((row) => (')
  const keyAt = lines.findIndex((line, index) => index > mapAt && line.includes("key={'recent-' + row.sessionId}"))
  if (keyAt < 0) throw new Error('recent key not found')
  lines.splice(keyAt + 1, 0,
    '                  ref={element => { recentDrag.register(row.sessionId, element) }}',
    '                  onPointerDown={event => { recentDrag.begin(event, row.sessionId) }}',
  )
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('SidebarQueue: 最近区用 recentRowsOrdered + 拖拽')
}

// ---------- RailCardMenu：复用地图菜单的类名与图标 ----------
{
  const f = 'src/client/rail-menu.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `import { t } from './i18n.ts'`,
    `import { t } from './i18n.ts'\nimport { MenuIcon, type MenuIconName } from './MenuIcons.tsx'`,
  )
  t = t.replace(
    `  const items: { key: string; label: string; onPick: () => void; danger?: boolean }[] = [`,
    `  const items: { key: string; label: string; icon: MenuIconName; onPick: () => void; danger?: boolean }[] = [`,
  )
  t = t.replace(`      key: 'pin',`, `      key: 'pin',\n      icon: props.target.pinned ? 'unpin' : 'pin',`)
  t = t.replace(`      key: 'unread',`, `      key: 'unread',\n      icon: 'unread',`)
  t = t.replace(`    { key: 'rename', label: t('menu.rename'), onPick: () => { setRename(true) } },`,
    `    { key: 'rename', icon: 'rename', label: t('menu.rename'), onPick: () => { setRename(true) } },`)
  t = t.replace(`    { key: 'digest', label: t('menu.viewDigest'), onPick: openDigest },`,
    `    { key: 'digest', icon: 'digest', label: t('menu.viewDigest'), onPick: openDigest },`)
  t = t.replace(`      key: 'archive',`, `      key: 'archive',\n      icon: 'archive',`)
  t = t.replace(
    `    <div
      ref={menuRef}
      className={styles['railMenu']}
      style={{ left, top }}
      role="menu"
    >`,
    `    <div
      ref={menuRef}
      className={styles['menu']}
      style={{ left, top, position: 'fixed' }}
      role="menu"
    >`,
  )
  t = t.replace(
    `        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={\`\${styles['railMenuItem']}\${item.danger === true ? \` \${styles['railMenuItemDanger']}\` : ''}\`}
          disabled={busy}
          onClick={item.onPick}
        >
          {item.label}
        </button>`,
    `        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={\`\${styles['menuItem']}\${item.danger === true ? \` \${styles['menuItemDanger'] ?? ''}\` : ''}\`}
          disabled={busy}
          onClick={item.onPick}
        >
          <MenuIcon name={item.icon} />
          {item.label}
        </button>`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('RailCardMenu: 复用 .menu/.menuItem + MenuIcon')
}
