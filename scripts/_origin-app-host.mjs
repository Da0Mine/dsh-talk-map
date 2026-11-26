import fs from 'node:fs'
const f = 'src/host/origin.ts'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  const from = headers.origin
  if (from === undefined) return true // curl / same-machine tooling
  // The desktop shell serves the client from its own scheme.
  if (from.startsWith('dsh-app://')) return true
  return isLoopback(hostName(from))`,
  `  const from = headers.origin
  if (from === undefined) return true // curl / same-machine tooling
  // The desktop shell serves the client from its own scheme; some builds proxy those requests
  // through the custom-protocol handler, where Host is the scheme's own authority.
  if (from.startsWith('dsh-app://')) {
    const name = hostName(host)
    return isLoopback(name) || name === 'app'
  }
  return isLoopback(hostName(from))`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('origin.ts: 允许 dsh-app:// 经自定义协议代理时的 Host=app')
