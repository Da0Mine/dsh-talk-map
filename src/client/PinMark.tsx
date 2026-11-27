/**
 * The pin mark, in one place: the map card and both rails must look identical.
 * Material push_pin, wider head and a longer needle so it still reads at 13px.
 */
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export function PinMark(): React.JSX.Element {
  return (
    <span className={styles['cardPin']} title={t('card.pinned')} aria-label={t('card.pinned')} data-talkmap-pin="1">
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16 8.6V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v4.6c0 1.66-1.34 3-3 3v2h5.1v7.9l.9 1 .9-1V13.6H19v-2c-1.66 0-3-1.34-3-3z"
        />
      </svg>
    </span>
  )
}
