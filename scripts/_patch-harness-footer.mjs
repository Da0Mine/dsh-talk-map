import fs from 'node:fs'
const file = 'test/harness.js'
let t = fs.readFileSync(file, 'utf8')

const before = `      }, Toggle === undefined ? null : h(Toggle, { wide: !sidebarCollapsed })),`
const after = `      },
      // Mirror the host's real sidebar-footer container:
      //   .footerButtons { display:flex; width:100%; align-items:center;
      //                    flex-direction:column; gap:2px }
      // Its align-items:center is what makes a child that does not claim full width sit
      // centred with a gap on the leading edge — reproduce it here, or the bug is invisible.
      h('div', {
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
if (!t.includes(before)) { console.log('anchor missing'); process.exit(1) }
t = t.replace(before, after)
// 侧栏宽度改成宿主实际量级（390），并保留 padding 8
t = t.replace('width: sidebarCollapsed ? 56 : 220,', 'width: sidebarCollapsed ? 56 : 390,')
fs.writeFileSync(file, t, 'utf8')
console.log('harness footer container mirrors host CSS; sidebar 390px')
