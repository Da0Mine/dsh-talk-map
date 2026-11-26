const { sameOrigin } = await import('../src/host/origin.ts')
const cases = [
  ['local curl', { host: '127.0.0.1:3080' }, true],
  ['same-origin page', { host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' }, true],
  ['desktop shell, loopback host', { host: '127.0.0.1:3080', origin: 'dsh-app://app' }, true],
  ['desktop shell, app host', { host: 'app', origin: 'dsh-app://app' }, true],
  ['evil origin', { host: '127.0.0.1:3080', origin: 'http://evil.com' }, false],
  ['DNS rebinding', { host: 'evil.com:3080', origin: 'http://evil.com:3080' }, false],
  ['public IP host', { host: '203.0.113.9:3080', origin: 'http://203.0.113.9:3080' }, false],
  ['missing Host', { origin: 'http://127.0.0.1:3080' }, false],
]
let failed = 0
for (const [name, headers, want] of cases) {
  const got = sameOrigin(headers)
  const ok = got === want
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} → ${got} (want ${want})`)
}
console.log(failed === 0 ? '全部通过' : `${failed} 条失败`)
process.exit(failed === 0 ? 0 : 1)
