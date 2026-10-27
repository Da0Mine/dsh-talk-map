import fs from 'node:fs'

const file = 'src/client/RenameDialog.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const out = []
for (const line of lines) {
  if (line.includes('equest, so') || line.includes('rgs is {')) continue
  if (line.includes('The wire payload takes NAMED args')) {
    out.push('      // The wire payload takes NAMED args: the endpoint declares a single parameter')
    continue
  }
  if (line.includes('called request, so args is')) continue
  out.push(line)
}
const text = out.join('\n').replace(
  /const result = await rpc\.call\('\/api', 'session\/rename', \{/,
  [
    '      // called "request", so args is { request: {...} }. An array is refused',
    '      // with "Remote payload must contain exactly one plain-object args field".',
    "      const result = await rpc.call('/api', 'session/rename', {",
  ].join('\n'),
)
fs.writeFileSync(file, text, 'utf8')
console.log('comment repaired')
