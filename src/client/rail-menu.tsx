/**
 * Right-click actions for queue cards, shared by the map's rail and the sidebar queue.
 *
 * The map canvas has had these verbs for a while; the rails only had click/drag. The list is the
 * same five the canvas offers for a card, minus anything that needs the board itself:
 * pin, mark unread, rename, view digest, archive.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { talkMapApi } from './api.ts'
import { DigestDialog } from './DigestDialog.tsx'
import { openMapPanel, requestBatch } from './map-state.ts'
import { t } from './i18n.ts'
import { MenuIcon, type MenuIconName } from './MenuIcons.tsx'
import { callRpc } from './rpc.ts'
import { localPins } from './pins.ts'
import { archiveSessions, setPinned, trashSessions } from './session-actions.ts'
import { sessionActivity } from './session-activity.ts'
import type { Digest } from '../shared/protocol.ts'
import styles from './talk-map.module.css'

export interface RailMenuTarget {
  sessionId: string
  title: string
  pinned: boolean
  /** Viewport position of the click. */
  x: number
  y: number
}

export interface RailCardMenuProps {
  target: RailMenuTarget
  onClose: () => void
  /** Fired after a verb that may change what the list should show. */
  onChanged?: () => void
}

export function RailCardMenu(props: RailCardMenuProps): React.JSX.Element {
  const [rename, setRename] = useState(false)
  const [renameValue, setRenameValue] = useState(props.target.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const flash = (text: string): void => {
    setNotice(text)
    window.setTimeout(() => { setNotice(null) }, 4000)
  }
  const [digest, setDigest] = useState<{ title: string; digest: Digest | undefined } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Clicking anywhere else closes the menu; Escape too.
  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      if (menuRef.current !== null && menuRef.current.contains(event.target as Node)) return
      props.onClose()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') props.onClose()
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [props])

  useEffect(() => {
    if (rename) inputRef.current?.focus()
  }, [rename])

  const run = (work: () => Promise<unknown>): void => {
    setBusy(true)
    void work()
      .then(() => { props.onChanged?.(); setBusy(false); flash('已执行'); props.onClose() })
      .catch((cause: unknown) => {
        // Show it: a silently swallowed rejection is why 置顶 looked like a no-op.
        const message = cause instanceof Error ? cause.message : String(cause)
        console.error('[dsh-talk-map] rail menu action failed:', cause)
        setError(message)
        flash('失败：' + message)
        setBusy(false)
      })
  }

  const submitRename = (): void => {
    const title = renameValue.trim()
    if (title === '') return
    run(async () => {
      await callRpc('session/rename', { sessionId: props.target.sessionId, title })
    })
  }

  const openDigest = (): void => {
    setBusy(true)
    void talkMapApi.ensureDigest(props.target.sessionId)
      .then((result) => {
        // Keep this component mounted: the dialog is rendered by it, and closing the menu here
        // unmounted the dialog with it (that is why 查看摘要 looked like a no-op).
        const hasDigest = result.digest !== undefined && result.digest !== null
        flash(hasDigest ? '摘要已打开' : '这个会话还没有摘要（摘要层未生成）')
        setDigest({ title: props.target.title, digest: result.digest })
      })
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : String(cause)
        console.error('[dsh-talk-map] digest fetch failed:', cause)
        flash('摘要失败：' + message)
      })
      .finally(() => { setBusy(false) })
  }

  if (digest !== null) {
    return createPortal(
      <DigestDialog title={digest.title} digest={digest.digest} onClose={() => { setDigest(null) }} />,
      document.body,
    )
  }

  if (rename) {
    return createPortal(
      <div className={styles['renameBackdrop']} onPointerDown={() => { props.onClose() }}>
        <div
          className={styles['renameDialog']}
          onPointerDown={(event) => { event.stopPropagation() }}
          role="dialog"
          aria-label={t('rename.title')}
        >
          <div className={styles['renameHeading']}>{t('rename.title')}</div>
          <input
            ref={inputRef}
            className={styles['renameInput']}
            value={renameValue}
            maxLength={120}
            placeholder={t('rename.placeholder')}
            onChange={(event) => { setRenameValue(event.target.value) }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitRename()
              if (event.key === 'Escape') props.onClose()
            }}
          />
          <div className={styles['renameActions']}>
            <button type="button" className={styles['renameCancel']} onClick={() => { props.onClose() }}>
              {t('rename.cancel')}
            </button>
            <button type="button" className={styles['renameConfirm']} disabled={busy} onClick={submitRename}>
              {t('rename.confirm')}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  const items: { key: string; label: string; icon: MenuIconName; onPick: () => void; danger?: boolean }[] = [
    {
      key: 'pin',
      icon: props.target.pinned ? 'unpin' : 'pin',
      label: props.target.pinned ? t('menu.unpin') : t('menu.pin'),
      onPick: () => {
        const next = !props.target.pinned
        // Our own set first: some builds do not expose the workspace pin, and 置顶 must still work.
        localPins.set(props.target.sessionId, next)
        flash(next ? '已置顶（本地）' : '已取消置顶（本地）')
        props.onChanged?.()
        props.onClose()
        void setPinned(props.target.sessionId, next).catch((cause: unknown) => {
          console.warn('[dsh-talk-map] workspace pin unavailable, kept the local pin:', cause)
        })
      },
    },
    {
      key: 'unread',
      icon: 'unread',
      label: t('menu.markUnread'),
      onPick: () => { sessionActivity.markFinished(props.target.sessionId); flash('已标为未读'); props.onChanged?.(); props.onClose() },
    },
    { key: 'rename', icon: 'rename', label: t('menu.rename'), onPick: () => { setRename(true) } },
    { key: 'digest', icon: 'digest', label: t('menu.viewDigest'), onPick: openDigest },
    {
      key: 'archive',
      icon: 'archive',
      label: t('menu.archive'),
      onPick: () => { run(() => archiveSessions([props.target.sessionId])) },
    },
    {
      key: 'batch',
      icon: 'batch',
      label: t('menu.batch'),
      onPick: () => {
        // Hand the pick to the map panel, which owns batch mode.
        requestBatch(props.target.sessionId)
        openMapPanel()
        props.onClose()
      },
    },
    {
      key: 'delete-session',
      icon: 'delete',
      label: t('menu.deleteSession'),
      danger: true,
      onPick: () => { run(() => trashSessions([props.target.sessionId])) },
    },
  ]

  const toast = notice === null
    ? null
    : createPortal(
        <div className={styles['railMenuToast']}>{notice}</div>,
        document.body,
      )

  const left = Math.min(props.target.x, window.innerWidth - 200)
  const top = Math.min(props.target.y, window.innerHeight - 40 - items.length * 30)
  return createPortal(
    <>
    {toast}
    <div
      ref={menuRef}
      className={styles['menu']}
      style={{ left, top, position: 'fixed', zIndex: 9999, pointerEvents: 'auto' }}
      role="menu"
    >
      {error !== null
        ? <div className={styles['menuError']}>{error}</div>
        : null}
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={`${styles['menuItem']}${item.danger === true ? ` ${styles['menuItemDanger'] ?? ''}` : ''}`}
          disabled={busy}
          onClick={item.onPick}
        >
          <MenuIcon name={item.icon} />
          {item.label}
        </button>
      ))}
    </div>
    </>,
    document.body,
  )
}
