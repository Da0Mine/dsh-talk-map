/** 宿主页接真主题：test/index.html 与 demo/index.html 引 dsh-theme.css + data-ds-dark-theme。 */
import fs from 'node:fs'

const stub = [
  '  /* The shell\'s own theme variables, minimally stubbed. */',
  '  :root {',
  '    --dsw-alias-bg-base: #1b1d21;',
  '    --dsw-alias-bg-layer-1: #23252a;',
  '    --dsw-alias-bg-mask-2: rgba(0, 0, 0, .45);',
  '    --dsw-alias-label-primary: #e7e9ee;',
  '    --dsw-alias-label-secondary: #a9aeb9;',
  '    --dsw-alias-label-tertiary: #7d828d;',
  '    --dsw-alias-border-l1: #33363d;',
  '    --dsw-alias-border-l2: #3d4047;',
  '    --dsw-alias-border-l3: #4a4e57;',
  '    --dsw-alias-brand-primary: #6f8dff;',
  '    --dsw-alias-interactive-bg-hover: rgba(255, 255, 255, .07);',
  '    --dsw-alias-interactive-bg-active: rgba(255, 255, 255, .12);',
  '  }',
].join('\n')

const withStub = fs.readFileSync('test/index.html', 'utf8').replace(/\r\n/g, String.fromCharCode(10))
if (!withStub.includes(stub)) {
  console.error('stub block not found in test/index.html — inspect manually')
  process.exit(1)
}

const replacement = [
  '  /* The real DSH theme, extracted from the installed app.asar',
  '     (scripts/extract-theme.mjs → test/dsh-theme.css). The dark palette is',
  '     activated by data-ds-dark-theme on <body>, exactly like the shell. */',
  '  <link rel="stylesheet" href="dsh-theme.css" />',
].join('\n')

let next = withStub.replace(stub, replacement.trim())
next = next.replace('<html lang="zh">', '<html lang="zh" data-ds-dark-theme>')
// 主题块挂在 body 选择器上，所以属性要在 <body>
next = next.replace('<body>', '<body data-ds-dark-theme>')
fs.writeFileSync('test/index.html', next, 'utf8')

let demo = fs.readFileSync('demo/index.html', 'utf8').replace(/\r\n/g, String.fromCharCode(10))
// demo 页是同一套 stub 的副本：同样处理
const demoStubStart = demo.indexOf('  /* The shell\'s own theme variables')
const demoStubEnd = demo.indexOf('  }', demoStubStart)
if (demoStubStart >= 0 && demoStubEnd > 0) {
  demo = demo.slice(0, demoStubStart) + [
    '  /* The real DSH theme, extracted from the installed app.asar. */',
    '  <link rel="stylesheet" href="../test/dsh-theme.css" />',
  ].join('\n') + demo.slice(demoStubEnd + 4)
}
demo = demo.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-ds-dark-theme>')
demo = demo.replace('<body>', '<body data-ds-dark-theme>')
// html/body 背景也换成真 token
demo = demo.replace('background: #1b1d21;', 'background: var(--dsw-alias-bg-base, #151517);')
fs.writeFileSync('demo/index.html', demo, 'utf8')

console.log('both host pages now use the real theme')
