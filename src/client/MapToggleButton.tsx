/**
 * Sidebar footer action row: the map's queue (wide sidebar) and, under it, the map toggle.
 * The "back to this conversation" crosshair that used to sit beside the toggle now lives in
 * the map panel's header, where it belongs to the panel rather than to the sidebar chrome.
 */
import { useEffect, useSyncExternalStore } from 'react'
import type { SidebarFooterActionOwnerProps } from './dsh.ts'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, currentSessionId, mapUi, openSessionInUi, reportSidebarWide } from './map-state.ts'
import { SidebarQueue } from './SidebarQueue.tsx'
import styles from './talk-map.module.css'

function MapIcon(): React.JSX.Element {
  return (
    <svg className={styles['toggleIcon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  )
}


/** Crosshair: "come back to the conversation this map was opened from". */
function BackIcon(): React.JSX.Element {
  return (
    <svg className={styles['backToCurrentIcon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 1.8v4.2M12 18v4.2M1.8 12h4.2M18 12h4.2" />
    </svg>
  )
}
export function MapToggleButton(props: SidebarFooterActionOwnerProps): React.JSX.Element {
  const open = useSyncExternalStore(mapUi.subscribe, () => mapUi.get().open)
  // This button lives outside the overlay, so it needs its own subscription
  // to re-render when the language changes.
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)
  const wide = props.wide
  // The map collapses the sidebar when it opens; this is how it learns whether
  // the sidebar is already a rail (the layout service has no read-only probe).
  useEffect(() => { reportSidebarWide(wide) }, [wide])
  const backTitle = t('map.backToCurrent')
  const classNames = [wide ? styles['toggleRow'] : styles['toggleButton']]
  if (open) classNames.push(styles['toggleButtonActive'])


  return (
    <div
      className={`${styles['toggleWrap']}${wide ? ` ${styles['toggleWrapWide']}` : ''}`}
      // The host puts footer entries in a ROW (.footerActions{display:flex}) whose parent
      // centres them (.footArea{align-items:center}) — with a plain class the queue ended up
      // beside the buttons and the buttons floated mid-height. Inline styles win regardless
      // of which CSS survived in the installed copy.
      style={wide ? { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, width: '100%', minWidth: 0, flex: '1 1 100%' } : undefined}
    >
      {/* The queue fills the empty space under the workspace list; it only makes sense
          when the sidebar is expanded into its wide form. */}
      {wide ? <SidebarQueue /> : null}
      {/* The two original controls keep their own row, so a long queue can never push
          them off the bottom of the sidebar. */}
      <div
        className={styles['toggleControls']}
        style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}
      >
      <button
        type="button"
        className={classNames.filter(Boolean).join(' ')}
        lang={locale}
        title={t('map.toggle')}
        aria-label={t('map.toggle')}
        aria-pressed={open}
        onClick={() => { mapUi.toggle() }}
      >
        <MapIcon />
        {wide ? <span className={styles['toggleLabel']}>{t('map.toggle')}</span> : null}
      </button>
      <button
        type="button"
        className={styles['backToCurrent']}
        lang={locale}
        title={backTitle}
        aria-label={backTitle}
        data-talkmap-back="1"
        onClick={() => {
          const sessionId = currentSessionId()
          if (sessionId === undefined) return
          // Leaving the map (if it is what you are looking at) and revealing the
          // conversation is one gesture: the shell then shows that session again.
          closeMapPanel()
          openSessionInUi(sessionId)
        }}
      >
        <BackIcon />
      </button>
      </div>
    </div>
  )
}
