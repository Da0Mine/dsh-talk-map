import fs from 'node:fs'

// ---------- 1) 侧栏置顶只影响侧栏：不再调用宿主 setPinned ----------
{
  const f = 'src/client/rail-menu.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `        localPins.set(props.target.sessionId, next)
        flash(next ? '已置顶（本地）' : '已取消置顶（本地）')
        props.onChanged?.()
        props.onClose()
        void setPinned(props.target.sessionId, next).catch((cause: unknown) => {
          console.warn('[dsh-talk-map] workspace pin unavailable, kept the local pin:', cause)
        })`,
    `        // Rail pins are the rail's own: they must not touch the workspace pin, which reorders
        // the map's folders (that is a different 置顶 with different meaning).
        localPins.set(props.target.sessionId, next)
        flash(next ? '已置顶（仅侧栏队列）' : '已取消置顶')
        props.onChanged?.()
        props.onClose()`,
  )
  // 摘要：ensure 不可用时退回 /talk-map/state 里的 digests
  t = t.replace(
    `    void talkMapApi.ensureDigest(props.target.sessionId)
      .then((result) => {`,
    `    const loadDigest = async (): Promise<{ digest: import('../shared/model.ts').Digest | undefined }> => {
      try {
        return await talkMapApi.ensureDigest(props.target.sessionId)
      } catch (cause) {
        // Older hosts have no /digest/ensure: read the stored digest out of the state payload.
        console.warn('[dsh-talk-map] ensureDigest failed, falling back to state:', cause)
        const state = await talkMapApi.fetchState()
        return { digest: state.digests?.[props.target.sessionId] }
      }
    }
    void loadDigest()
      .then((result) => {`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('rail-menu: 侧栏置顶独立 + 摘要回退')
}

// ---------- 2) StatusRail：置顶图标 + 置顶卡浮到最前 ----------
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `      <div className={styles['cardTop']}>
        <span className={styles['cardTitle']}>{entry.title}</span>
      </div>`,
    `      <div className={styles['cardTop']}>
        <span className={styles['cardTitle']}>{entry.title}</span>
        {isPinnedSession(localPinSet, entry.sessionId)
          ? <span className={styles['cardPinIcon']} title="已置顶" aria-hidden="true">📌</span>
          : null}
      </div>`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 置顶图标')
}

// ---------- 3) SidebarQueue：置顶图标 ----------
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `              <div className={styles['cardTop']}>
                <span className={styles['cardTitle']}>{row.title}</span>
              </div>`,
    `              <div className={styles['cardTop']}>
                <span className={styles['cardTitle']}>{row.title}</span>
                {isPinnedSession(localPinSet, row.sessionId)
                  ? <span className={styles['cardPinIcon']} title="已置顶" aria-hidden="true">📌</span>
                  : null}
              </div>`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 置顶图标')
}
