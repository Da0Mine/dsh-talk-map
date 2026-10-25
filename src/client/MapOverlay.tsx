/**
 * The map as a `main` panel: an ordinary centre-column page, the same seat the
 * Plugins page or the recycle bin occupies. Being a panel (instead of a
 * frame-wide overlay) is what makes the "finished while you were elsewhere"
 * signal work — the shell is no longer holding a conversation on screen, so a
 * session that finishes is still unread and its card can glow.
 *
 * The shell owns the selection: this component exists only while the panel is
 * selected, so mount/unmount is the real open/closed state and the sidebar
 * button mirrors it.
 */
import { useEffect, useSyncExternalStore } from 'react'
import type { LocalePref } from '../shared/model.ts'
import type { RootSlotStandardProps } from './dsh.ts'
import { canvas } from './canvas-store.ts'
import { activeLocale, LOCALE_CYCLE, subscribeLocale, t } from './i18n.ts'
import { closeMapPanel, hideSidebarForMap, mapUi, restoreSidebarAfterMap } from './map-state.ts'
import { MapCanvas } from './MapCanvas.tsx'
import styles from './talk-map.module.css'

/**
 * Interface language: cycles auto → 中文 → English. 'auto' follows dsh's
 * own <html lang>, which is what every install had before this setting.
 */
function LanguageButton(): React.JSX.Element {
  const pref = useSyncExternalStore(canvas.subscribe, () => canvas.get().global?.locale ?? 'auto')
  const index = LOCALE_CYCLE.indexOf(pref)
  const next: LocalePref = LOCALE_CYCLE[(index + 1) % LOCALE_CYCLE.length] ?? 'auto'
  return (
    <button
      type="button"
      className={styles['langButton']}
      title={t('lang.hint', { current: t(`lang.${pref}`), next: t(`lang.${next}`) })}
      onClick={() => { canvas.patchGlobalNow({ locale: next }) }}
    >
      {t(`lang.${pref}`)}
    </button>
  )
}

function BackIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function MapOverlay(props: RootSlotStandardProps): React.JSX.Element {
  // Subscribing here re-renders the whole panel on a language switch;
  // MapCanvas re-keys its own memos so the React-Flow nodes follow.
  useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)

  // The shell selected this panel: publish that so the sidebar button, the
  // hotkey and the context menu all agree on the state — and give the map the
  // width it needs by folding the sidebar away for as long as the panel is up
  // (unmount puts it back, which also covers "opened a session from a card").
  useEffect(() => {
    mapUi.setOpen(true)
    hideSidebarForMap()
    return () => {
      mapUi.setOpen(false)
      restoreSidebarAfterMap()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      // An inner surface (spawn preview, drawer, batch bar, hotkey capture)
      // claims Esc for itself.
      if (mapUi.escapeClaimed()) return
      event.stopPropagation()
      closeMapPanel()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => { window.removeEventListener('keydown', onKeyDown, { capture: true }) }
  }, [])

  return (
    <div className={styles['panel']} lang={activeLocale()} role="dialog" aria-label={t('map.title')}>
      <div className={styles['header']}>
        <button
          type="button"
          className={styles['backButton']}
          title={t('map.back')}
          aria-label={t('map.back')}
          onClick={closeMapPanel}
        >
          <BackIcon />
          <span>{t('map.back')}</span>
        </button>
        <span className={styles['headerSpace']} />
        <LanguageButton />
        <button
          type="button"
          className={styles['closeButton']}
          title={t('map.close')}
          aria-label={t('map.close')}
          onClick={closeMapPanel}
        >
          <CloseIcon />
        </button>
      </div>
      <MapCanvas {...props} />
    </div>
  )
}
