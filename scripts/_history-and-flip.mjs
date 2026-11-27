import fs from 'node:fs'

// ---------- state-persist：增加 history（完成后进入过的历史，落盘，重启保留） ----------
{
  const f = 'src/client/state-persist.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `  /** sessionId → when it was last seen running (amber "已中断" after restart). */
  interrupted: Record<string, number>
}`,
    `  /** sessionId → when it was last seen running (amber "已中断" after restart). */
  interrupted: Record<string, number>
  /** sessionId → when it finished for the first time. Survives the 待查看 being read, so
   * 「最近的任务」 still knows about it after a restart. */
  history: Record<string, number>
}`,
  )
  t = t.replace(
    `const EMPTY: PersistedLampState = { version: 1, finished: {}, errors: {}, interrupted: {} }`,
    `const EMPTY: PersistedLampState = { version: 1, finished: {}, errors: {}, interrupted: {}, history: {} }`,
  )
  t = t.replace(
    `    interrupted: patch.interrupted ?? base.interrupted,
  }`,
    `    interrupted: patch.interrupted ?? base.interrupted,
    history: patch.history ?? base.history,
  }`,
  )
  t = t.replace(
    `    finished: prune(parsed.finished ?? {}, now),`,
    `    finished: prune(parsed.finished ?? {}, now),
    history: prune(parsed.history ?? {}, now),`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('state-persist: history 字段')
}

// ---------- reorder：FLIP 用同一种口径（都取视口坐标），让已让位的行 delta≈0 ----------
{
  const f = 'src/client/reorder.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `          before.set(id, id === drag.id ? element.getBoundingClientRect().top : element.offsetTop)`,
    `          // Viewport position as DISPLAYED at release. Rows that already slid for the drop have
          // their new layout slot right here, so their later delta is ~0 and they do not twitch.
          before.set(id, element.getBoundingClientRect().top)`,
  )
  t = t.replace(
    `          const after = id === releasedId ? element.getBoundingClientRect().top : element.offsetTop`,
    `          // Same measure after the commit: the shift transforms are gone, so rect.top is the
          // row's real slot. Comparing like with like is what makes the deltas trustworthy.
          const after = element.getBoundingClientRect().top`,
  )
  t = t.replace(`      const releasedId = drag.id\n`, '')
  fs.writeFileSync(f, t, 'utf8')
  console.log('reorder: FLIP 统一视口口径')
}
