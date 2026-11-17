import fs from 'node:fs'
const file = 'test/harness.js'
let t = fs.readFileSync(file, 'utf8')
// 精确镜像宿主：footArea(column, align-items:center) > footerActions(display:flex 行)
const before = `      h('div', {
        'data-harness-footer': '1',
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          flex: 'none',
        },
      }, Toggle === undefined ? null : h(Toggle, { wide: !sidebarCollapsed }))),`
const after = `      h('div', {
        'data-harness-footer': '1',
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 'none',
        },
      },
      h('div', {
        'data-harness-footer-actions': '1',
        style: { display: 'flex', width: '100%', minWidth: 0, flex: 'none' },
      }, Toggle === undefined ? null : h(Toggle, { wide: !sidebarCollapsed })))),`
if (!t.includes(before)) { console.log('anchor missing'); process.exit(1) }
fs.writeFileSync(file, t.replace(before, after), 'utf8')
console.log('harness mirrors footArea(column/center) > footerActions(row)')
