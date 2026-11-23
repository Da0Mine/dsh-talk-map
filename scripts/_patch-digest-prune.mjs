/**
 * Digest retention: digests accumulate for sessions that no longer have a card
 * (1 178 rows for 122 cards on this machine). Prune at startup, keep a cap.
 */
import fs from 'node:fs'

const storeFile = 'src/host/store.ts'
let store = fs.readFileSync(storeFile, 'utf8')

if (!store.includes('export async function pruneDigests')) {
  const anchor = '/** Typed table handles over the untyped structural Domain. */'
  if (!store.includes(anchor)) throw new Error('store anchor missing')
  const fn = `/**
 * Drop digests that no longer have a card, then keep at most \`cap\` of the rest (oldest
 * out). Digests are keyed by session id, so a card is what makes one reachable.
 */
export async function pruneDigests(
  store: TalkMapStore,
  cap = 400,
): Promise<{ orphans: number; overflow: number; kept: number }> {
  const cardSessions = new Set<string>()
  for (const [, card] of store.cards.entries()) cardSessions.add(card.sessionId)

  const orphans: string[] = []
  const reachable: { key: string; at: number }[] = []
  for (const [key, digest] of store.digests.entries()) {
    if (!cardSessions.has(key)) orphans.push(key)
    else reachable.push({ key, at: digest.generatedAt ?? 0 })
  }

  const overflow: string[] = []
  if (reachable.length > cap) {
    reachable.sort((a, b) => a.at - b.at)
    for (const row of reachable.slice(0, reachable.length - cap)) overflow.push(row.key)
  }

  for (const key of [...orphans, ...overflow]) {
    try {
      await store.digests.delete(key)
    } catch {
      // A failed delete must not stop the rest of the prune.
    }
  }
  return {
    orphans: orphans.length,
    overflow: overflow.length,
    kept: Math.min(reachable.length, cap),
  }
}

` + anchor
  store = store.replace(anchor, fn)
  fs.writeFileSync(storeFile, store, 'utf8')
  console.log('store.ts: pruneDigests added')
}

// call it once the domain is open
const entry = 'src/index.ts'
let text = fs.readFileSync(entry, 'utf8')
if (!text.includes('pruneDigests')) {
  const anchor = "        services.logger?.info?.('[dsh-talk-map] storage domain open, routes live at /talk-map/')"
  if (!text.includes(anchor)) throw new Error('entry anchor missing')
  text = text.replace(
    anchor,
    anchor + `
        // One pass at startup: digests for sessions that no longer have a card are dead
        // weight (they were 655 KB of a 1.3 MB store here), and the rest is capped.
        void pruneDigests(opened)
          .then((result) => {
            if (result.orphans + result.overflow > 0) {
              services.logger?.info?.(
                \`[dsh-talk-map] pruned \${result.orphans} orphaned + \${result.overflow} over-cap digests, \${result.kept} kept\`,
              )
            }
          })
          .catch((error) => {
            services.logger?.warn?.(\`[dsh-talk-map] digest prune failed: \${String(error)}\`)
          })`,
  )
  // import it
  const importAt = text.split('\n').findIndex(line => line.includes('openTalkMapStore'))
  if (importAt < 0) throw new Error('store import not found')
  text = text.replace(/import \{([^}]*)\} from '\.\/host\/store\.ts'/, (all, names) => {
    const list = names.split(',').map(n => n.trim()).filter(Boolean)
    if (!list.includes('pruneDigests')) list.push('pruneDigests')
    return `import { ${list.join(', ')} } from './host/store.ts'`
  })
  fs.writeFileSync(entry, text, 'utf8')
  console.log('index.ts: pruneDigests wired')
}
