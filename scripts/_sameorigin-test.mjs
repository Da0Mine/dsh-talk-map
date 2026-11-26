// 用一个最小的单元测试把 issue #7 的 8 个用例钉住
const cases = [
  { name: 'local curl (no Origin, loopback Host)', headers: { host: '127.0.0.1:3080' }, want: true },
  { name: 'same-origin page', headers: { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' }, want: true },
  { name: 'localhost same-origin', headers: { host: 'localhost:3080', origin: 'http://localhost:3080' }, want: true },
  { name: 'desktop shell scheme', headers: { host: '127.0.0.1:3080', origin: 'dsh-app://app' }, want: true },
  { name: 'evil origin', headers: { host: '127.0.0.1:3080', origin: 'http://evil.com' }, want: false },
  { name: 'DNS rebinding (host=evil, origin=evil)', headers: { host: 'evil.com:3080', origin: 'http://evil.com:3080' }, want: false },
  { name: 'DNS rebinding (host=203.0.113.9)', headers: { host: '203.0.113.9:3080', origin: 'http://203.0.113.9:3080' }, want: false },
  { name: 'missing Host', headers: { origin: 'http://127.0.0.1:3080' }, want: false },
]
const src = (await import('node:fs')).readFileSync('src/host/routes.ts', 'utf8')
const start = src.indexOf('const LOOPBACK_NAMES')
const end = src.indexOf('async function readJsonBody')
if (start < 0 || end < 0) { console.error('FAIL 找不到 sameOrigin 段落'); process.exit(1) }
const body = src.slice(start, end).replace(/request: IncomingMessage/g, 'request: any')
const mod = await import('data:text/javascript,' + encodeURIComponent(
  `class URL2 extends URL {}\n` + body + `\nexport { sameOrigin }`,
).replace(/IncomingMessage/g, 'any'))
let failed = 0
for (const c of cases) {
  const got = mod.sameOrigin({ headers: c.headers })
  const ok = got === c.want
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name} → ${got} (want ${c.want})`)
}
console.log(failed === 0 ? '全部通过' : `${failed} 条失败`)
process.exit(failed === 0 ? 0 : 1)
