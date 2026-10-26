/**
 * Why hold back a version? Look at what actually changed instead of guessing:
 * list the versions between installed and latest, their publish dates, and the
 * repository so the changelog can be read.
 */
const targets = [
  { name: 'dsh-context', from: '0.75.0', to: '0.77.0' },
  { name: 'dsh-rewind-plugin', from: '0.18.0', to: '0.19.1' },
]

for (const target of targets) {
  const response = await fetch(`https://registry.npmmirror.com/${encodeURIComponent(target.name)}`, {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) {
    console.log(target.name, 'http', response.status)
    continue
  }
  const pack = await response.json()
  const versions = Object.keys(pack.versions ?? {})
  const fromIndex = versions.indexOf(target.from)
  const between = fromIndex >= 0 ? versions.slice(fromIndex) : versions.slice(-6)
  const latestMeta = pack.versions?.[target.to] ?? pack.versions?.[pack['dist-tags']?.latest]
  console.log(`\n=== ${target.name}  ${target.from} → ${target.to}`)
  console.log('repository:', JSON.stringify(latestMeta?.repository ?? pack.repository ?? null))
  console.log('homepage:  ', latestMeta?.homepage ?? pack.homepage ?? '—')
  console.log('publish times:')
  for (const version of between.slice(-8)) {
    const when = pack.time?.[version] ?? '?'
    console.log('  ', version.padEnd(12), when)
  }
}
