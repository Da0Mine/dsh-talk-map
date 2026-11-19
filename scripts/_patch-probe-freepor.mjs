import fs from 'node:fs'
const f = 'test/probe.mjs'
let t = fs.readFileSync(f, 'utf8')
if (t.includes('const CDP = await freePort()')) { console.log('already dynamic'); process.exit(0) }

// 1) 固定 9333 → 运行时挑一个空闲端口
t = t.replace("const CDP = 9333", [
  '// Never a fixed port: a leftover browser there (earlier versions did exactly that) would',
  '// make us attach to and drive a window we do not own — the 2026-11-18 crash.',
  'const CDP = await (async () => {',
  "  const { createServer } = await import('node:net')",
  '  return await new Promise((resolve, reject) => {',
  '    const server = createServer()',
  '    server.once(\'error\', reject)',
  "    server.listen(0, '127.0.0.1', () => {",
  '      const address = server.address()',
  '      const port = typeof address === \'object\' && address !== null ? address.port : 0',
  '      server.close(() => resolve(port))',
  '    })',
  '  })',
  '})()',
].join('\n'))
fs.writeFileSync(f, t, 'utf8')
console.log('probe: CDP port is chosen at runtime')
