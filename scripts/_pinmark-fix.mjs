import fs from 'node:fs'

// StatusRail：修掉错误的 entry.title 参数
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `{isPinnedSession(localPinSet, entry.title === "" ? '' : entry.title) ? <PinMark /> : null}`,
    `{isPinnedSession(localPinSet, entry.sessionId) ? <PinMark /> : null}`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 修 pin 条件')
}

// SidebarQueue：把残留的 📌 与错误的通用替换一并修正
{
  const f = 'src/client/SidebarQueue.tsx'
  let t = fs.readFileSync(f, 'utf8')
  // 主行
  t = t.replace(
    /<>\n\s*\{isPinnedSession\(localPinSet, row === "" \? '' : row\) \? <PinMark \/> : null\}\n\s*<span className=\{styles\['cardTitle'\]\}>\{row\}<\/span>\n\s*<\/>/,
    `<span className={styles['cardTitle']}>{row}</span>`,
  )
  t = t.replace(
    `{isPinnedSession(localPinSet, row === "" ? '' : row) ? <PinMark /> : null}`,
    `{isPinnedSession(localPinSet, row.sessionId) ? <PinMark /> : null}`,
  )
  // 旧的 emoji 标记
  t = t.replace(
    `                {isPinnedSession(localPinSet, row.sessionId)
                  ? <span className={styles['cardPinIcon']} title="已置顶" aria-hidden="true">📌</span>
                  : null}`,
    `                {isPinnedSession(localPinSet, row.sessionId) ? <PinMark /> : null}`,
  )
  t = t.replace(
    `                <span className={styles['cardPinIcon']} title="已置顶" aria-hidden="true">📌</span>`,
    `                <PinMark />`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('SidebarQueue: 修 pin 条件')
}
