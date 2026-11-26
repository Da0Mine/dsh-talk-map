import fs from 'node:fs'

// 1) 把 sameOrigin 抽成独立模块，便于单测
const origin = `/**
 * Origin/Host gate for the mutating /talk-map/* routes.
 *
 * Comparing the Origin host with the Host header proves nothing: under DNS rebinding the
 * attacking page chooses both (issue #7), so evil.example rebinding to 127.0.0.1 would send
 * Host: evil.example:3080 together with Origin: http://evil.example:3080 and pass the old check.
 * The Host itself therefore has to name this machine.
 */
const LOOPBACK_NAMES = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

export function hostName(value: string): string | undefined {
  try {
    // The Host header carries no scheme; http:// only satisfies the parser.
    return new URL(value.includes('://') ? value : \`http://\${value}\`).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

export function isLoopback(value: string | undefined): boolean {
  if (value === undefined) return false
  if (LOOPBACK_NAMES.has(value)) return true
  // 127.0.0.0/8 is all loopback.
  return /^127\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$/.test(value)
}

export function sameOrigin(headers: { host?: string | undefined; origin?: string | undefined }): boolean {
  const host = headers.host
  if (host === undefined) return false
  // DNS rebinding reaches the loopback listener carrying the attacker's hostname in Host.
  if (!isLoopback(hostName(host))) return false
  const from = headers.origin
  if (from === undefined) return true // curl / same-machine tooling
  // The desktop shell serves the client from its own scheme.
  if (from.startsWith('dsh-app://')) return true
  return isLoopback(hostName(from))
}
`
fs.writeFileSync('src/host/origin.ts', origin, 'utf8')

// 2) routes.ts 改为引用它
const f = 'src/host/routes.ts'
let t = fs.readFileSync(f, 'utf8')
const start = t.indexOf('/**\n * Only names that mean "this machine" are accepted.')
const end = t.indexOf('async function readJsonBody')
if (start < 0 || end < 0) throw new Error('inline sameOrigin block missing')
t = t.slice(0, start) + t.slice(end)
t = t.replace(
  `import { createPreviewCache, runLimited, PREVIEW_CONCURRENCY } from './preview.ts'`,
  `import { sameOrigin } from './origin.ts'\nimport { createPreviewCache, runLimited, PREVIEW_CONCURRENCY } from './preview.ts'`,
)
// 调用点现在传 headers
t = t.replace(/sameOrigin\(request\)/g, 'sameOrigin(request.headers)')
fs.writeFileSync(f, t, 'utf8')
console.log('origin.ts 抽出，routes.ts 改为引用')
