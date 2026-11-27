import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('.sidebarQueueMore')) {
  const lines = [
    '',
    '/* The sidebar queue 查看更多: identical to the rail one. */',
    '.sidebarQueueMore {',
    '  margin: 2px 6px 6px;',
    '  padding: 6px 10px;',
    '  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14));',
    '  border-radius: 8px;',
    '  background: transparent;',
    '  color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.7));',
    '  font: inherit;',
    '  font-size: 11.5px;',
    '  cursor: pointer;',
    '}',
    '',
    '.sidebarQueueMore:hover {',
    '  color: var(--dsw-alias-label-primary, #fff);',
    '  border-color: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.24));',
    '}',
    '',
  ]
  fs.writeFileSync(f, t.trimEnd() + '\n' + lines.join('\n'), 'utf8')
  console.log('CSS 写入完成')
}
