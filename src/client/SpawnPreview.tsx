/**
 * The fork panel: shown when a connection is dropped on empty canvas.
 * Three inheritance modes for the new conversation:
 *   none   — fresh conversation, the edge is a visual link only
 *            (needs a first message: an empty session would be invisible)
 *   digest — the parent's digest is injected as background (editable here)
 *   full   — dsh-native fork: the child carries the parent's full history
 * All modes drop the new card at the release point and jump into the chat.
 */
import { useEffect, useState } from 'react'
import { talkMapApi } from './api.ts'
import { canvas, INBOX_BOARD_ID, newCardId } from './canvas-store.ts'
import { buildInjectionText } from './digest-text.ts'
import { closeMapPanel, forkSessionInUi, getServices, mapUi, openSessionInUi } from './map-state.ts'
import { callRpc } from './rpc.ts'
import { t } from './i18n.ts'
import type { Card, EdgeInjection } from '../shared/model.ts'
import styles from './talk-map.module.css'

export interface PendingSpawn {
  parent: { cardId: string; sessionId: string; title: string }
  /** The parent session's workspace — mode 'none' creates the sibling there. */
  parentWorkspaceId?: string
  /** Flow position where the connection was dropped (card lands here). */
  x: number
  y: number
}

type SpawnMode = 'digest' | 'context' | 'full'

export function SpawnPreview(props: {
  pending: PendingSpawn
  onClose: () => void
}): React.JSX.Element {
  const { pending } = props
  const digest = canvas.get().digests[pending.parent.sessionId]
  // Full history is the default: dropping a connection on empty canvas means
  // "continue this conversation over there".
  const [mode, setMode] = useState<SpawnMode>('full')
  const [text, setText] = useState(() => buildInjectionText(pending.parent.title, digest))
  const [firstMessage, setFirstMessage] = useState('')
  /** Fetching the live window (mode 'context' only). */
  const [contextBusy, setContextBusy] = useState(false)
  const [contextNote, setContextNote] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const release = mapUi.claimEscape('spawn-preview')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        props.onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Picking "current context" loads it once: the preview is editable text, exactly like
  // the digest mode, so it can be trimmed before the new conversation starts.
  useEffect(() => {
    if (mode !== 'context') return
    let alive = true
    setContextBusy(true)
    setContextNote(undefined)
    void talkMapApi.contextWindow(pending.parent.sessionId)
      .then((page) => {
        if (!alive) return
        const body = page.text.trim()
        setText(body === ''
          ? ''
          : `${t('inject.contextHeader')}「${pending.parent.title}」\n\n${body}\n\n${t('inject.contextNote')}`)
        setContextNote(body === ''
          ? t('spawn.contextEmpty')
          : page.truncated
            ? t('spawn.contextTruncated', { n: String(page.chars) })
            : t('spawn.contextLoaded', { n: String(page.chars), m: String(page.entries) }))
      })
      .catch((error: unknown) => {
        if (alive) setContextNote(String((error as Error | undefined)?.message ?? error))
      })
      .finally(() => { if (alive) setContextBusy(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pending.parent.sessionId])

  const addCardAndEdge = (sessionId: string, kind: EdgeInjection['kind'], injectedText?: string): string => {
    const cardId = newCardId()
    const card: Card = {
      boardId: INBOX_BOARD_ID,
      sessionId,
      x: pending.x,
      y: pending.y,
      createdAt: Date.now(),
    }
    canvas.addCards({ [cardId]: card })
    canvas.addEdges({
      [`edge-${crypto.randomUUID()}`]: {
        boardId: INBOX_BOARD_ID,
        fromCardId: pending.parent.cardId,
        toCardId: cardId,
        injection: { kind, ...(injectedText !== undefined ? { injectedText } : {}) },
        createdAt: Date.now(),
      },
    })
    return cardId
  }

  const jumpIn = (sessionId: string): void => {
    props.onClose()
    if (openSessionInUi(sessionId)) closeMapPanel()
  }

  const confirm = async (): Promise<void> => {
    if (busy) return
    const services = getServices()
    if (services === undefined) return
    setBusy(true)
    setError(undefined)
    try {
      const createSession = async (): Promise<{ sessionId: string }> => callRpc<{ sessionId: string }>(
        'session/create',
        pending.parentWorkspaceId !== undefined ? { workspaceId: pending.parentWorkspaceId } : {},
      )
      if (mode === 'digest') {
        if (text.trim() === '') throw new Error(t('spawn.needText'))
        // The session comes from dsh's own create RPC — full composition
        // (tools, preset, workspace binding) identical to a normal new chat.
        // The plugin only injects the digest into it afterwards.
        const created = await createSession()
        // Refresh the digest on demand: unchanged conversation → no LLM call.
        let injected = text
        try {
          const fresh = await talkMapApi.ensureDigest(pending.parent.sessionId)
          if (fresh.digest !== undefined && !digestIsEmpty(fresh.digest)) {
            injected = buildInjectionText(pending.parent.title, fresh.digest)
          }
        } catch { /* fall back to the text we already had */ }
        await talkMapApi.injectContext(created.sessionId, [
          { sessionId: pending.parent.sessionId, text: injected },
        ])
        addCardAndEdge(created.sessionId, 'digest', text)
        jumpIn(created.sessionId)
        return
      }
      if (mode === 'context') {
        if (text.trim() === '') throw new Error(t('spawn.needText'))
        const created = await createSession()
        await talkMapApi.injectContext(created.sessionId, [
          { sessionId: pending.parent.sessionId, text },
        ])
        addCardAndEdge(created.sessionId, 'context', text)
        jumpIn(created.sessionId)
        return
      }
      if (mode === 'full') {
        // dsh-native fork: the child carries the parent's full history.
        const childId = await forkSessionInUi(pending.parent.sessionId)
        addCardAndEdge(childId, 'full')
        jumpIn(childId)
        return
      }
      // mode === 'none': fresh conversation in the parent's workspace,
      // linked visually. A first message is required — an empty session
      // would be blank and invisible on the board.
      if (firstMessage.trim() === '') throw new Error(t('spawn.needFirstMessage'))
      const created = await createSession()
      addCardAndEdge(created.sessionId, 'none')
      await callRpc('session/prompt', {
        sessionId: created.sessionId,
        mode: 'queue',
        content: [{ type: 'text', text: firstMessage }],
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      jumpIn(created.sessionId)
    } catch (spawnError) {
      setError(String(spawnError))
      setBusy(false)
    }
  }

  const modes: { id: SpawnMode; label: string }[] = [
    { id: 'digest', label: t('spawn.mode.digest') },
    { id: 'context', label: t('spawn.mode.context') },
    { id: 'full', label: t('spawn.mode.full') },
  ]

  return (
    <div className={styles['spawnPanel']} role="dialog" aria-label={t('spawn.heading')}>
      <div className={styles['spawnHeading']}>{t('spawn.heading')}</div>
      <div className={styles['spawnFrom']}>{t('spawn.from')}「{pending.parent.title}」</div>
      <div className={styles['spawnModes']}>
        {modes.map(entry => (
          <button
            key={entry.id}
            type="button"
            className={`${styles['spawnModeBtn']}${mode === entry.id ? ` ${styles['spawnModeActive']}` : ''}`}
            onClick={() => { setMode(entry.id) }}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {mode === 'digest'
        ? (
            <>
              <div className={styles['spawnHint']}>{t('spawn.hint')}</div>
              <textarea
                className={`${styles['spawnTextarea']} nodrag nowheel`}
                value={text}
                rows={9}
                onChange={(event) => { setText(event.target.value) }}
              />
            </>
          )
        : mode === 'context'
          ? (
              <>
                <div className={styles['spawnHint']}>{t('spawn.contextHint')}</div>
                {contextNote !== undefined
                  ? <div className={styles['spawnHint']}>{contextNote}</div>
                  : null}
                <textarea
                  className={`${styles['spawnTextarea']} nodrag nowheel`}
                  value={contextBusy ? t('spawn.contextLoading') : text}
                  readOnly={contextBusy}
                  rows={9}
                  onChange={(event) => { setText(event.target.value) }}
                />
              </>
            )
          : mode === 'none'
          ? (
              <>
                <div className={styles['spawnHint']}>{t('spawn.noneHint')}</div>
                <textarea
                  className={`${styles['spawnTextarea']} nodrag nowheel`}
                  placeholder={t('draft.placeholder')}
                  value={firstMessage}
                  rows={5}
                  onChange={(event) => { setFirstMessage(event.target.value) }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      void confirm()
                    }
                  }}
                />
              </>
            )
          : <div className={styles['spawnHint']}>{t('spawn.fullHint')}</div>}
      {error !== undefined ? <div className={styles['spawnError']}>{error}</div> : null}
      <div className={styles['spawnActions']}>
        <button
          type="button"
          className={styles['spawnBtnGhost']}
          onClick={props.onClose}
          disabled={busy}
        >
          {t('spawn.cancel')}
        </button>
        <button
          type="button"
          className={styles['spawnBtnPrimary']}
          onClick={() => { void confirm() }}
          disabled={busy || contextBusy
            || (mode === 'digest' && text.trim() === '')
            || (mode === 'context' && text.trim() === '')
            || (mode === 'none' && firstMessage.trim() === '')}
        >
          {busy ? t('spawn.busy') : t('spawn.confirm')}
        </button>
      </div>
    </div>
  )
}
