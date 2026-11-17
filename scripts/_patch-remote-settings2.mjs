import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let s = fs.readFileSync(i18n, 'utf8')
if (!s.includes("'remote.section'")) {
  const zh = "  'map.title': '对话地图 ·v2',"
  const en = "  'map.title': 'Talk Map ·v2',"
  if (!s.includes(zh) || !s.includes(en)) throw new Error('anchor still missing')
  const zhKeys = [
    "  'remote.section': '远程控制',",
    "  'remote.note': '远程控制的入口已从左侧栏移到这里（它原本只有侧栏那一个按钮）。点下面按钮打开它的面板；想恢复侧栏按钮，删掉 RemoteEntry.tsx 里那条隐藏样式即可。',",
    "  'remote.open': '打开远程控制面板',",
    "  'remote.missing': '没找到远程控制插件的入口节点——它可能被禁用或未安装。',",
  ].join('\n')
  const enKeys = [
    "  'remote.section': 'Remote control',",
    "  'remote.note': 'The remote-control entry moved here from the sidebar (its only entry used to be that sidebar button). Open it below; to put the sidebar button back, delete the hiding rule in RemoteEntry.tsx.',",
    "  'remote.open': 'Open the remote control panel',",
    "  'remote.missing': 'The remote-control entry node was not found — the plugin may be disabled or missing.',",
  ].join('\n')
  s = s.replace(zh, zh + '\n' + zhKeys).replace(en, en + '\n' + enKeys)
  fs.writeFileSync(i18n, s, 'utf8')
  console.log('i18n: remote keys')
}
const css = 'src/client/talk-map.module.css'
let c = fs.readFileSync(css, 'utf8')
if (!c.includes('.remotePanel {')) {
  c += "\n" + [
    '/* Settings page: the remote-control entry that used to sit in the sidebar footer. */',
    '.remotePanel {',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: flex-start;',
    '  gap: 12px;',
    '  max-width: 560px;',
    '  padding: 4px 0;',
    '}',
    '',
    '.remoteNote {',
    '  margin: 0;',
    '  font-size: 13px;',
    '  line-height: 20px;',
    '  color: var(--dsw-alias-label-secondary);',
    '}',
    '',
    '.remoteOpen {',
    '  padding: 6px 14px;',
    '  border: 1px solid var(--dsw-alias-border-l2);',
    '  border-radius: 8px;',
    '  background: var(--dsw-alias-bg-layer-1);',
    '  color: var(--dsw-alias-label-primary);',
    '  font: inherit;',
    '  font-size: 13px;',
    '  cursor: pointer;',
    '}',
    '',
    '.remoteOpen:hover {',
    '  background: var(--dsw-alias-interactive-bg-hover);',
    '}',
    '',
    '.remoteMissing {',
    '  margin: 0;',
    '  font-size: 12px;',
    '  color: var(--dsw-alias-state-error-primary);',
    '}',
    '',
  ].join('\n')
  fs.writeFileSync(css, c, 'utf8')
  console.log('css: remote panel')
}
