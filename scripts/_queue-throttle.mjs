import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

t = t.replace(
  `  /** sessionId → the stamp we already asked for; a newer stamp means ask again. */
  const askedRef = useRef<Map<string, number>>(new Map())`,
  `  /**
   * sessionId → when we last asked. Reads cost a whole session surface each, and a running
   * session's updatedAt changes constantly; keying on the stamp meant re-reading forever.
   */
  const askedRef = useRef<Map<string, number>>(new Map())
  const PREVIEW_REFRESH_MS = 25000`,
)
t = t.replace(
  `        .filter(item => askedRef.current.get(item.id) !== item.stamp)`,
  `        .filter(item => (Date.now() - (askedRef.current.get(item.id) ?? 0)) > PREVIEW_REFRESH_MS)`,
)
t = t.replace(
  `    for (const item of wanted) askedRef.current.set(item.id, item.stamp)`,
  `    for (const item of wanted) askedRef.current.set(item.id, Date.now())`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 重读节流 25s')
