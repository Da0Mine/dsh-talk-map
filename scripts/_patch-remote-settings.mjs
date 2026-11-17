import fs from 'node:fs'
// 1) index.ts: 注册设置分区 + 安装隐藏样式
const f = 'src/client/index.ts'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('RemoteControlPanel')) {
  t = t.replace(
    "import { MapOverlay } from './MapOverlay.tsx'",
    "import { MapOverlay } from './MapOverlay.tsx'\nimport { RemoteControlPanel, installRemoteEntryHiding } from './RemoteEntry.tsx'",
  )
  t = t.replace(
    "    registerSafely('main', () => ctx.slots.register({",
    [
      "    // The remote-control plugin's only entry is a sidebar footer button; the user",
      "    // wants it in the settings page instead. Hide it there, host it here.",
      "    installRemoteEntryHiding()",
      "    registerSafely('settings.section', () => ctx.slots.register({",
      "      name: 'settings.section',",
      "      id: 'talk-map-remote',",
      "      order: 30,",
      "      label: () => t('remote.section'),",
      "    }, RemoteControlPanel), 'settings.section')",
      "    registerSafely('main', () => ctx.slots.register({",
    ].join('\n'),
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('index.ts: settings.section registered')
}
// 2) i18n
const i18n = 'src/client/i18n.ts'
let s = fs.readFileSync(i18n, 'utf8')
if (!s.includes("'remote.section'")) {
  const zh = "  'map.title': '对话地图 ·v2',"
  const en = "  'map.title': 'Conversation map ·v2',"
  if (!s.includes(zh) || !s.includes(en)) throw new Error('i18n anchor missing')
  const zhKeys = [
    "  'remote.section': '远程控制',",
    "  'remote.note': '远程控制的入口已从左侧栏移到这里（它原本只有一个侧栏按钮）。点下面的按钮打开它的面板；想恢复侧栏按钮，把 dsh-talk-map 的 RemoteEntry.tsx 里那条隐藏样式去掉即可。',",
    "  'remote.open': '打开远程控制面板',",
    "  'remote.missing': '没有找到远程控制插件的入口节点——它可能被禁用或未安装。',",
  ].join('\n')
  const enKeys = [
    "  'remote.section': 'Remote control',",
    "  'remote.note': 'The remote-control entry moved here from the sidebar (its only entry used to be a sidebar button). Open it below; to put the sidebar button back, remove the hiding rule in talk-map\\'s RemoteEntry.tsx.',",
    "  'remote.open': 'Open the remote control panel',",
    "  'remote.missing': 'The remote-control entry node was not found — the plugin may be disabled or missing.',",
  ].join('\n')
  s = s.replace(zh, zh + '\n' + zhKeys).replace(en, en + '\n' + enKeys)
  fs.writeFileSync(i18n, s, 'utf8')
  console.log('i18n: remote keys')
}
// 3) CSS
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
