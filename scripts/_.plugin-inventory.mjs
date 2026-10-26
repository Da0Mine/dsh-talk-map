/**
 * Inventory: installed plugin versions vs npm `latest`, plus the compatibility
 * fields that decide whether an update is safe (engines.dsh / dsh peer range).
 * Read-only.
 */
import fs from 'node:fs'
import path from 'node:path'

const profile = path.join(process.env.USERPROFILE, '.dsh', 'profiles', 'desktop')
const manifest = JSON.parse(fs.readFileSync(path.join(profile, 'package.json'), 'utf8'))

function installedVersion(name) {
  const pkgFile = path.join(profile, 'node_modules', name, 'package.json')
  if (!fs.existsSync(pkgFile)) return null
  try {
    return JSON.parse(fs.readFileSync(pkgFile, 'utf8')).version ?? null
  } catch {
    return null
  }
}

async function latest(name) {
  try {
    const response = await fetch(`https://registry.npmmirror.com/${encodeURIComponent(name)}/latest`, {
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return { error: `http ${response.status}` }
    const body = await response.json()
    return {
      version: body.version,
      engines: body.engines ?? null,
      peer: body.peerDependencies ?? null,
      deprecated: body.deprecated ?? null,
    }
  } catch (error) {
    return { error: String(error?.message ?? error) }
  }
}

const rows = []
for (const [name, spec] of Object.entries(manifest.dependencies ?? {})) {
  const isLocal = /^(link|file|github|git|workspace|portal):/.test(spec)
  const current = installedVersion(name)
  const info = isLocal ? null : await latest(name)
  rows.push({ name, spec, isLocal, current, info })
}

console.log('name'.padEnd(34), 'installed'.padEnd(12), 'latest'.padEnd(12), 'update?')
for (const row of rows) {
  const latestVersion = row.info?.version ?? (row.info?.error ?? '—')
  let verdict = '—'
  if (row.isLocal) verdict = 'local (skip)'
  else if (row.current !== null && row.info?.version !== undefined) {
    verdict = row.current === row.info.version ? 'up to date' : `→ ${row.info.version}`
  }
  console.log(
    row.name.padEnd(34),
    String(row.current ?? row.spec).padEnd(12),
    String(latestVersion).padEnd(12),
    verdict,
  )
}

console.log('\n--- compatibility of the ones with updates ---')
for (const row of rows) {
  if (row.isLocal || row.info?.version === undefined || row.current === row.info.version) continue
  const engines = row.info.engines === null ? '—' : JSON.stringify(row.info.engines)
  const peer = row.info.peer === null ? '—' : JSON.stringify(row.info.peer)
  console.log(`${row.name} ${row.current} → ${row.info.version}`)
  console.log(`   engines: ${engines}`)
  console.log(`   peer:    ${peer}`)
  if (row.info.deprecated) console.log(`   DEPRECATED: ${row.info.deprecated}`)
}
