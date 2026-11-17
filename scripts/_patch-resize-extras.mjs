import fs from 'node:fs'
// i18n
{
  const f = 'src/client/i18n.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("'statusRail.resize'")) {
    const zh = "  'statusRail.title': '队列中的任务',"
    const en = "  'statusRail.title': 'Tasks in the queue',"
    if (!t.includes(zh) || !t.includes(en)) throw new Error('i18n anchor missing')
    t = t.replace(zh, zh + "\n  'statusRail.resize': '拖动调整高度（双击恢复自适应）',")
    t = t.replace(en, en + "\n  'statusRail.resize': 'Drag to resize (double-click to fit)',")
    fs.writeFileSync(f, t, 'utf8')
  }
  console.log('i18n resize ok')
}
// css
{
  const f = 'src/client/talk-map.module.css'
  let s = fs.readFileSync(f, 'utf8')
  if (!s.includes('.queueGrip {')) {
    s += "\n" + [
      '/* ── drag handle: the queue\'s top edge ──────────────────────────────────── */',
      '.queueGrip {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  flex: none;',
      '  height: 10px;',
      '  margin: -4px 0 0;',
      '  cursor: ns-resize;',
      '  opacity: 0;',
      '  transition: opacity 120ms ease;',
      '  touch-action: none;',
      '}',
      '',
      '/* Only appears while the pointer is over the queue block. */',
      '.sidebarQueue:hover .queueGrip,',
      '.queueGrip:active {',
      '  opacity: 1;',
      '}',
      '',
      '.queueGripBar {',
      '  width: 32px;',
      '  height: 3px;',
      '  border-radius: 2px;',
      '  background: var(--dsw-alias-label-tertiary, #6b7280);',
      '}',
      '',
    ].join('\n')
    fs.writeFileSync(f, s, 'utf8')
  }
  console.log('css grip ok')
}
