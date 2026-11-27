import fs from 'node:fs'
const f = 'src/client/rail-menu.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) notice 状态
t = t.replace(
  `  const [error, setError] = useState<string | null>(null)`,
  `  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const flash = (text: string): void => {
    setNotice(text)
    window.setTimeout(() => { setNotice(null) }, 4000)
  }`,
)

// 2) 成功/失败都留痕
t = t.replace(
  `      .then(() => { props.onChanged?.(); setBusy(false); props.onClose() })`,
  `      .then(() => { props.onChanged?.(); setBusy(false); flash('已执行'); props.onClose() })`,
)
t = t.replace(
  `        setError(message)
        setBusy(false)`,
  `        setError(message)
        flash('失败：' + message)
        setBusy(false)`,
)

// 3) 各动作给明确文案
t = t.replace(
  `        localPins.set(props.target.sessionId, next)
        props.onChanged?.()
        props.onClose()`,
  `        localPins.set(props.target.sessionId, next)
        flash(next ? '已置顶（本地）' : '已取消置顶（本地）')
        props.onChanged?.()
        props.onClose()`,
)
t = t.replace(
  `      onPick: () => { sessionActivity.markFinished(props.target.sessionId); props.onChanged?.(); props.onClose() },`,
  `      onPick: () => { sessionActivity.markFinished(props.target.sessionId); flash('已标为未读'); props.onChanged?.(); props.onClose() },`,
)
t = t.replace(
  `      .then((result) => {
        // Keep this component mounted: the dialog is rendered by it, and closing the menu here
        // unmounted the dialog with it (that is why 查看摘要 looked like a no-op).
        setDigest({ title: props.target.title, digest: result.digest })
      })`,
  `      .then((result) => {
        // Keep this component mounted: the dialog is rendered by it, and closing the menu here
        // unmounted the dialog with it (that is why 查看摘要 looked like a no-op).
        const hasDigest = result.digest !== undefined && result.digest !== null
        flash(hasDigest ? '摘要已打开' : '这个会话还没有摘要（摘要层未生成）')
        setDigest({ title: props.target.title, digest: result.digest })
      })`,
)
t = t.replace(
  `      .catch((error: unknown) => { console.error('[dsh-talk-map] digest fetch failed:', error) })`,
  `      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : String(cause)
        console.error('[dsh-talk-map] digest fetch failed:', cause)
        flash('摘要失败：' + message)
      })`,
)

// 4) toast 渲染
t = t.replace(
  `  const left = Math.min(props.target.x, window.innerWidth - 200)`,
  `  const toast = notice === null
    ? null
    : createPortal(
        <div className={styles['railMenuToast']}>{notice}</div>,
        document.body,
      )

  const left = Math.min(props.target.x, window.innerWidth - 200)`,
)
t = t.replace(
  `  return createPortal(
    <div
      ref={menuRef}`,
  `  return createPortal(
    <>
    {toast}
    <div
      ref={menuRef}`,
)
t = t.replace(
  `      ))}
    </div>,
    document.body,
  )
}`,
  `      ))}
    </div>
    </>,
    document.body,
  )
}`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('rail-menu: 动作结果 toast')
