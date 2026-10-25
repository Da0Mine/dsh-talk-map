/**
 * The drawer behind a folder's stack cell: every conversation of that
 * workspace, at 1:1 size (224px wide — exactly what the map looks like at
 * 100% zoom), in a wheel-driven pager: one notch scrolls one card, like a
 * phone's app menu.
 */
import { useEffect, useRef } from 'react'
import { mapUi } from './map-state.ts'
import { t } from './i18n.ts'
import { relativeTime } from './SessionCard.tsx'
import type { CardGlow } from './SessionCard.tsx'
import styles from './talk-map.module.css'
const LAMP_CLASS: Record<CardGlow, string> = {
  running: 'cardLampRunning',
  done: 'cardLampDone',
  error: 'cardLampError',
  waiting: 'cardLampWaiting',
}

export interface StackEntry {
  cardId: string
  title: string
  summary?: string
  nextStep?: string
  updatedAt?: number
  running?: boolean
  glow?: CardGlow
}

export interface StackDrawerProps {
  workspaceTitle: string
  items: readonly StackEntry[]
  onOpenCard: (cardId: string) => void
  onClose: () => void
}

export function StackDrawer(props: StackDrawerProps): React.JSX.Element {
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const release = mapUi.claimEscape('stack-drawer')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      props.onClose()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Wheel = page, not micro-scroll: one notch is one card. Registered natively
  // because React attaches wheel listeners passively, where preventDefault is a
  // no-op (and logs an error).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault()
      const first = scroller.querySelector('[data-stack-card]')
      const step = first instanceof HTMLElement ? first.offsetHeight + 12 : 140
      scroller.scrollBy({ top: event.deltaY >= 0 ? step : -step, behavior: 'smooth' })
    }
    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => { scroller.removeEventListener('wheel', onWheel) }
  }, [])

  return (
    <div
      className={styles['drawerBackdrop']}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) props.onClose()
      }}
    >
      <div className={styles['drawer']} role="dialog" aria-label={props.workspaceTitle}>
        <div className={styles['drawerHead']}>
          <span className={styles['drawerTitle']}>{props.workspaceTitle}</span>
          <span className={styles['drawerCount']}>{t('stack.total', { n: String(props.items.length) })}</span>
          <span className={styles['drawerSpace']} />
          <span className={styles['drawerHint']}>{t('stack.hint')}</span>
          <button
            type="button"
            className={styles['drawerClose']}
            title={t('stack.close')}
            aria-label={t('stack.close')}
            onClick={props.onClose}
          >
            ×
          </button>
        </div>
        <div className={styles['drawerScroll']} ref={scrollerRef}>
          {props.items.map(item => {
            const classNames = [styles['card'], styles['drawerCard']]
            if (item.glow !== undefined) classNames.push(styles[LAMP_CLASS[item.glow]] ?? '')
            return (
              <button
                key={item.cardId}
                type="button"
                data-stack-card=""
                className={classNames.filter(Boolean).join(' ')}
                onClick={() => { props.onOpenCard(item.cardId) }}
              >
                <div className={styles['cardTop']}>
                  <span className={styles['cardTitle']}>{item.title}</span>
                </div>
                {item.summary !== undefined && item.summary !== ''
                  ? <div className={styles['cardSummary']}>{item.summary}</div>
                  : null}
                {item.nextStep !== undefined && item.nextStep !== ''
                  ? (
                      <div className={styles['cardNext']}>
                        <span className={styles['cardNextLabel']}>{t('card.next')}</span>
                        <span className={styles['cardNextText']}>{item.nextStep}</span>
                      </div>
                    )
                  : null}
                <div className={styles['cardFooter']}>
                  <span className={styles['cardTime']}>{relativeTime(item.updatedAt)}</span>
                  {item.running === true ? <span className={styles['cardBadgeRunning']}>{t('card.running')}</span> : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
