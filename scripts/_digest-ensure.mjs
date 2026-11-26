import fs from 'node:fs'

// ---------- host：补 /talk-map/digest/ensure（只读已存摘要，不烧额度） ----------
{
  const f = 'src/host/routes.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("'POST /talk-map/digest/ensure'")) {
    t = t.replace(
      `        if (route === 'POST /talk-map/digest/refresh') {`,
      `        if (route === 'POST /talk-map/digest/ensure') {
          // Read the digest that is already stored. The client has asked for this route since it
          // gained the card menu, but only /refresh existed, so 查看摘要 always 404'd.
          const body = refreshDigestBody.parse(await readJsonBody(request))
          const digest = store.digests.get(body.sessionId)
          sendJson(response, 200, { sessionId: body.sessionId, digest })
          return
        }

        if (route === 'POST /talk-map/digest/refresh') {`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('host: 新增 /talk-map/digest/ensure')
  }
}

// ---------- 菜单：失败要显示原因，成功要回调刷新 ----------
{
  const f = 'src/client/rail-menu.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  const [busy, setBusy] = useState(false)`,
    `  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)`,
  )
  t = t.replace(
    `    void work()
      .then(() => { props.onChanged?.() })
      .catch((error: unknown) => { console.error('[dsh-talk-map] rail menu action failed:', error) })
      .finally(() => { setBusy(false); props.onClose() })`,
    `    void work()
      .then(() => { props.onChanged?.(); setBusy(false); props.onClose() })
      .catch((cause: unknown) => {
        // Show it: a silently swallowed rejection is why 置顶 looked like a no-op.
        const message = cause instanceof Error ? cause.message : String(cause)
        console.error('[dsh-talk-map] rail menu action failed:', cause)
        setError(message)
        setBusy(false)
      })`,
  )
  t = t.replace(
    `      {items.map(item => (`,
    `      {error !== null
        ? <div className={styles['menuError']}>{error}</div>
        : null}
      {items.map(item => (`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('rail-menu: 失败原因可见')
}
