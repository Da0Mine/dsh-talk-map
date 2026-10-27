/**
 * Rename one conversation from the map.
 *
 * Deliberately our own small dialog instead of the shell's: the shell drives its
 * rename dialog from a client service the map cannot reach, and the official
 * channel for the mutation itself is the `sessionController.rename` RPC
 * ("Rename one Session after explicitly resuming it"), which the connection
 * client exposes as `api.sessions.rename`.
 */
import { useEffect, useRef, useState } from 'react'
import { connectionApi, mapUi } from './map-state.ts'
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export interface RenameTarget {
  sessionId: string
  title: string
}

export interface RenameDialogProps {
  target: RenameTarget
  onDone: (title: string | null) => void
}

export function RenameDialog(props: RenameDialogProps): React.JSX.Element {
  const [value, setValue] = useState(props.target.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const release = mapUi.claimEscape('rename-dialog')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      props.onDone(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    inputRef.current?.focus()
    inputRef.current?.select()
    return () => {
      release()
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [props])

  const submit = async (): Promise<void> => {
    const title = value.trim()
    if (title === '' || busy) return
    if (title === props.target.title) {
      props.onDone(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const renamed = await connectionApi()?.sessions.rename({ sessionId: props.target.sessionId, title })
      const failure = renamed?.result !== undefined && renamed.result.ok !== true ? renamed.result : undefined
      if (failure !== undefined) {
        setError(t('rename.failed'))
        setBusy(false)
        return
      }
      props.onDone(title)
    } catch (cause) {
      console.error('[dsh-talk-map] rename failed:', cause)
      setError(t('rename.failed'))
      setBusy(false)
    }
  }

  return (
    <div className={styles['renameBackdrop']} onClick={() => { props.onDone(null) }}>
      <div
        className={styles['renameDialog']}
        onClick={(event) => { event.stopPropagation() }}
        role="dialog"
        aria-label={t('rename.title')}
      >
        <div className={styles['renameHeading']}>{t('rename.title')}</div>
        <input
          ref={inputRef}
          className={styles['renameInput']}
          value={value}
          maxLength={120}
          placeholder={t('rename.placeholder')}
          onChange={(event) => { setValue(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void submit()
          }}
        />
        {error !== null ? <div className={styles['renameError']}>{error}</div> : null}
        <div className={styles['renameActions']}>
          <button type="button" className={styles['renameButton']} onClick={() => { props.onDone(null) }}>
            {t('rename.cancel')}
          </button>
          <button
            type="button"
            className={`${styles['renameButton']} ${styles['renamePrimary']}`}
            disabled={busy || value.trim() === ''}
            onClick={() => { void submit() }}
          >
            {busy ? t('rename.saving') : t('rename.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
