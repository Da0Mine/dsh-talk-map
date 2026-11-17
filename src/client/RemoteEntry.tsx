/**
 * The remote-control plugin (`ds-harness-remote`) puts its only entry in the native
 * sidebar footer. The user wants that button out of the sidebar and reachable from the
 * settings page instead.
 *
 * We do NOT touch the third-party bundle: its footer entry stays mounted but is hidden by
 * one global CSS rule, and a normal settings section (「远程控制」) hosts a button that
 * clicks the hidden node — the panel is still fully functional, just no longer in the
 * sidebar. Both pieces live here, so deleting this file + its two registrations restores
 * the original behaviour.
 */
import { useEffect, useState } from 'react'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { useSyncExternalStore } from 'react'
import styles from './talk-map.module.css'

/** The class the remote plugin gives its sidebar footer entry. */
const REMOTE_ENTRY = '.dshRemoteSidebarEntry'
const STYLE_ID = 'dsh-talk-map-hide-remote-entry'

/** Hide the remote plugin's sidebar entry (idempotent, removable). */
export function installRemoteEntryHiding(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  // Hiding (not unmounting) keeps its state and makes the click below work.
  style.textContent = `${REMOTE_ENTRY}{display:none !important}`
  document.head.appendChild(style)
}

/** Settings page body: explains where the button went and re-opens that panel. */
export function RemoteControlPanel(): React.JSX.Element {
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)
  const [found, setFound] = useState<boolean | null>(null)

  useEffect(() => {
    setFound(document.querySelector(REMOTE_ENTRY) !== null)
  }, [])

  const open = (): void => {
    const node = document.querySelector<HTMLElement>(REMOTE_ENTRY)
    const target = node?.querySelector<HTMLElement>('button') ?? node
    if (target === null || target === undefined) {
      setFound(false)
      return
    }
    target.click()
  }

  return (
    <div className={styles['remotePanel']} lang={locale}>
      <p className={styles['remoteNote']}>{t('remote.note')}</p>
      <button type="button" className={styles['remoteOpen']} onClick={open}>
        {t('remote.open')}
      </button>
      {found === false
        ? <p className={styles['remoteMissing']}>{t('remote.missing')}</p>
        : null}
    </div>
  )
}
