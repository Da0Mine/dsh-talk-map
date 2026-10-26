/**
 * The drawer behind a folder's stack cell: every conversation of that
 * workspace, at 1:1 size (224px wide — exactly what the map looks like at
 * 100% zoom), in a multi-column grid. The wheel pages one ROW at a time, like a
 * phone's app drawer.
 */
import { useEffect, useRef } from 'react'
import { mapUi } from './map-state.ts'
import { t } from './i18n.ts'
import { relativeTime, LAMP_CHIP } from './SessionCard.tsx'
import type { CardGlow } from './SessionCard.tsx'
import styles from './talk-map.module.css'
const LAMP_CLASS: Record<CardGlow, string> = {
  running: 'cardLampRunning',
  done: 'cardLampDone',
  error: 'cardLampError',
  waiting: 'cardLampWaiting',
}

/**
 * Pitch of one grid row. The cards sit in a multi-column grid, so the step is
 * the distance between the first card of this row and the first card of the
 * next one (falling back to a single card's height when there is only one row).
 */
function rowStep(scroller: HTMLElement): number {
  const cards = [...scroller.querySelectorAll('[data-stack-card]')] as HTMLElement[]
  const first = cards[0]
  if (first === undefined) return 140
  const nextRow = cards.find(card => card.offsetTop > first.offsetTop + 2)
  if (nextRow !== undefined) return nextRow.offsetTop - first.offsetTop
  return first.offsetHeight + 12
}

export interface StackEntry {  cardId: string
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
      scroller.scrollBy({ top: event.deltaY >= 0 ? rowStep(scroller) : -rowStep(scroller), behavior: 'smooth' })
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
                  {item.glow === undefined
                    ? null
                    : (
                        <span className={`${styles['cardChip']} ${styles[LAMP_CHIP[item.glow].className]}`}>
                          {item.glow === 'running' ? <span className={styles['runningDot']} /> : null}
                          {t(LAMP_CHIP[item.glow].key)}
                        </span>
                      )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
