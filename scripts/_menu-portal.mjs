import fs from 'node:fs'
const f = 'src/client/rail-menu.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) portal + 依赖
t = t.replace(
  `import { useEffect, useRef, useState } from 'react'`,
  `import { useEffect, useRef, useState } from 'react'\nimport { createPortal } from 'react-dom'`,
)
t = t.replace(
  `import { archiveSessions, setPinned, trashSessions } from './session-actions.ts'`,
  `import { localPins } from './pins.ts'\nimport { archiveSessions, setPinned, trashSessions } from './session-actions.ts'`,
)

// 2) 置顶：本地集合一定生效，宿主接口尽力而为
t = t.replace(
  `    {
      key: 'pin',
      icon: props.target.pinned ? 'unpin' : 'pin',
      label: props.target.pinned ? t('menu.unpin') : t('menu.pin'),
      onPick: () => { run(() => setPinned(props.target.sessionId, !props.target.pinned)) },
    },`,
  `    {
      key: 'pin',
      icon: props.target.pinned ? 'unpin' : 'pin',
      label: props.target.pinned ? t('menu.unpin') : t('menu.pin'),
      onPick: () => {
        const next = !props.target.pinned
        // Our own set first: some builds do not expose the workspace pin, and 置顶 must still work.
        localPins.set(props.target.sessionId, next)
        props.onChanged?.()
        props.onClose()
        void setPinned(props.target.sessionId, next).catch((cause: unknown) => {
          console.warn('[dsh-talk-map] workspace pin unavailable, kept the local pin:', cause)
        })
      },
    },`,
)

// 3) 三种弹层都挂到 body：rail 根节点 pointer-events:none，队列面板 overflow:hidden
t = t.replace(
  `  if (digest !== null) {
    return <DigestDialog title={digest.title} digest={digest.digest} onClose={() => { setDigest(null) }} />
  }`,
  `  if (digest !== null) {
    return createPortal(
      <DigestDialog title={digest.title} digest={digest.digest} onClose={() => { setDigest(null) }} />,
      document.body,
    )
  }`,
)
t = t.replace(
  `  if (rename) {
    return (
      <div className={styles['renameBackdrop']} onPointerDown={() => { props.onClose() }}>`,
  `  if (rename) {
    return createPortal(
      <div className={styles['renameBackdrop']} onPointerDown={() => { props.onClose() }}>`,
)
t = t.replace(
  `        </div>
      </div>
    )
  }

  const items:`,
  `        </div>
      </div>,
      document.body,
    )
  }

  const items:`,
)
t = t.replace(
    `  return (
    <div
      ref={menuRef}
      className={styles['menu']}
      style={{ left, top, position: 'fixed' }}
      role="menu"
    >`,
  `  return createPortal(
    <div
      ref={menuRef}
      className={styles['menu']}
      style={{ left, top, position: 'fixed', zIndex: 9999, pointerEvents: 'auto' }}
      role="menu"
    >`,
)
t = t.replace(
  `      ))}
    </div>
  )
}`,
  `      ))}
    </div>,
    document.body,
  )
}`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('rail-menu: portal 到 body + 本地置顶')
