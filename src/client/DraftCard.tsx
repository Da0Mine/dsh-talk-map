/**
 * The draft card: double-clicking empty canvas opens this in-place composer
 * node instead of jumping into the conversation UI. Nothing exists until 发送
 * — then (optionally) a workspace is created, a session is created in it,
 * the optional model selection is applied, the first prompt is queued, and
 * the draft turns into a normal card at the same spot. The user stays on the
 * map; the running dot shows progress.
 *
 * Defaults are shown as real values (via /talk-map/defaults): the default
 * model route and the deployment's default agent preset. Double-clicking
 * inside a workspace frame preselects that workspace; anywhere else the
 * selector defaults to creating a new workspace.
 */
import { useEffect, useRef, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import type { AgentPresetEntry, ModelProviderGroup } from './dsh.ts'
import { talkMapApi } from './api.ts'
import { canvas, INBOX_BOARD_ID, newCardId } from './canvas-store.ts'
import { closeMapPanel, connectionApi, getServices, mapUi, openSessionInUi, servicesDiag, uiWorkspaceService } from './map-state.ts'
import { t } from './i18n.ts'
import styles from './talk-map.module.css'

export interface DraftCardData extends Record<string, unknown> {
  /** Workspaces to choose from (id + display title + path), map-order. */
  workspaceOptions: { id: string; title: string; path: string }[]
  /** Preselected workspace (set when the double-click landed inside a frame). */
  defaultWorkspaceId?: string
  /** Map group the draft was opened in — the new card's frame membership. */
  groupId?: string
  onClose: () => void
}

export type DraftCardNodeType = Node<DraftCardData, 'draftCard'>

const NEW_WORKSPACE = '__new__'
const MODE_STANDARD = 'standard'
const MODE_CREATIVE = 'cordis'
const MODE_IDS = [MODE_STANDARD, MODE_CREATIVE] as const
const GRID = 16
const snap = (value: number): number => Math.round(value / GRID) * GRID

function unwrap<T>(response: { result: { ok: true; value: T } | { ok: false; error: { code?: string; message?: string } } }, what: string): T {
  const { result } = response
  if (result.ok) return result.value
  throw new Error(`${what}: ${result.error.code ?? ''} ${result.error.message ?? ''}`.trim())
}

/** Parent directory new workspaces land in: alongside the existing ones. */
function newWorkspaceParent(options: { path: string }[]): string {
  const sample = options[0]?.path
  if (sample === undefined) return '~'
  const cut = sample.lastIndexOf('/')
  return cut > 0 ? sample.slice(0, cut) : sample
}

export function DraftCardNode(props: NodeProps<DraftCardNodeType>): React.JSX.Element {
  const { data } = props
  const [workspaceId, setWorkspaceId] = useState(data.defaultWorkspaceId ?? data.workspaceOptions[0]?.id ?? NEW_WORKSPACE)
  const [newWsName, setNewWsName] = useState('')
  const [modelKey, setModelKey] = useState('')
  // Mode = the agent preset the new conversation is composed with. The map
  // offers the two built-ins the shell itself offers: 标准模式 / 创造模式.
  const [mode, setMode] = useState(MODE_STANDARD)
  const [presetId, setPresetId] = useState('')
  const [text, setText] = useState('')
  const [groups, setGroups] = useState<ModelProviderGroup[]>([])
  const [presets, setPresets] = useState<readonly AgentPresetEntry[]>([])
  const [defaultModelLabel, setDefaultModelLabel] = useState('')
  const [defaultPresetLabel, setDefaultPresetLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    const release = mapUi.claimEscape('draft-card')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        data.onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      release()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // A hot reload can hand out a `connection` service whose `.api` is not
    // attached yet. Reading through it throws a TypeError during the HMR pass
    // and takes the whole client entry down ("web boot: 1 entry did not
    // activate"), so every call site gates on the api itself.
    const api = connectionApi()
    api?.llm.models({}).then((response) => {
      if (response.result.ok) setGroups(response.result.value.groups ?? [])
    }).catch(() => undefined)
    api?.agentPresets.list({}).then((response) => {
      if (response.result.ok) {
        const list = response.result.value.presets
        setPresets(list)
        // Prefer the plain "standard" preset for map-born conversations —
        // the deployment default may be a specialized mode (e.g. cordis).
        if (list.some(preset => preset.id === 'standard')) {
          setPresetId(previous => (previous === '' ? 'standard' : previous))
        }
      }
    }).catch(() => undefined)
    talkMapApi.getDefaults().then((defaults) => {
      if (defaults.model !== null) setDefaultModelLabel(defaults.model.model)
      if (defaults.preset !== null) setDefaultPresetLabel(defaults.preset)
    }).catch(() => undefined)
  }, [])

  const creatingWorkspace = workspaceId === NEW_WORKSPACE
  const wsParent = newWorkspaceParent(data.workspaceOptions)
  const newWsPath = `${wsParent}/${newWsName.trim()}`
  // Both built-ins are offered unconditionally. The preset RPC is advisory —
  // it can be empty on a cold boot, or fail outright — and gating the whole
  // picker on it meant the mode row simply never appeared. Only disable a mode
  // when the list DID load and provably lacks it.
  const availableModes = MODE_IDS.filter(id => presets.length === 0 || presets.some(preset => preset.id === id))
  const selectedPreset = availableModes.includes(mode) ? mode : presetId
  const sendDisabled = busy || text.trim() === '' || (creatingWorkspace && newWsName.trim() === '')

  const send = async (): Promise<void> => {
    const services = getServices()
    if (services === undefined || sendDisabled) return
    setBusy(true)
    setError(undefined)
    try {
      // dsh's own new-session path. `connection.api` does not exist on this
      // runtime (ctx.sessions has no create/prompt either) — startSession is
      // the supported entry: it goes through session.create, so the session
      // gets the same composition as a normal new chat, and it PRE-FILLS the
      // composer with the first message instead of sending it. It returns
      // void, so no card can be placed from here.
      const ui = uiWorkspaceService()
      if (ui === undefined || typeof ui.startSession !== 'function') {
        throw new Error(`${t('draft.apiUnavailable')} [${servicesDiag()}]`)
      }
      if (creatingWorkspace) throw new Error(t('draft.newWorkspaceUnsupported'))
      ui.startSession(workspaceId, {
        prompt: text,
        ...(selectedPreset !== '' ? { agentPreset: selectedPreset } : {}),
      })
      data.onClose()
      closeMapPanel()
    } catch (sendError) {
      setError(String(sendError))
      setBusy(false)
    }
  }

  return (
    <div
      className={styles['draftCard']}
      role="dialog"
      aria-label={t('draft.heading')}
      // Form controls own their pointer events entirely: React Flow's node
      // machinery must never see them, or the native <select> dropdown opens
      // and instantly closes (the flash-close bug).
      onPointerDownCapture={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('select, textarea, input, button') !== null) event.stopPropagation()
      }}
      onMouseDownCapture={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('select, textarea, input, button') !== null) event.stopPropagation()
      }}
    >
      <div className={styles['draftHeading']}>{t('draft.heading')}</div>
      <div className={styles['draftRow']}>
        <label className={styles['draftLabel']}>{t('draft.workspace')}</label>
        <select
          className={`${styles['draftSelect']} nodrag`}
          value={workspaceId}
          onChange={(event) => { setWorkspaceId(event.target.value) }}
        >
          <option value={NEW_WORKSPACE}>{t('draft.newWorkspace')}</option>
          {data.workspaceOptions.map(option => (
            <option key={option.id} value={option.id}>{option.title}</option>
          ))}
        </select>
      </div>
      {creatingWorkspace
        ? (
            <div className={styles['draftRow']}>
              <label className={styles['draftLabel']}>{t('draft.wsName')}</label>
              <div className={styles['draftGrow']}>
                <input
                  className={`${styles['draftInput']} nodrag`}
                  value={newWsName}
                  placeholder={t('draft.wsNamePlaceholder')}
                  onChange={(event) => { setNewWsName(event.target.value) }}
                />
                {newWsName.trim() !== ''
                  ? <div className={styles['draftPathPreview']}>{newWsPath}</div>
                  : null}
              </div>
            </div>
          )
        : null}
      {availableModes.length > 0
        ? (
            <div className={styles['draftRow']}>
              <label className={styles['draftLabel']}>{t('draft.mode')}</label>
              <div className={styles['modeSwitch']} role="radiogroup" aria-label={t('draft.mode')}>
                {availableModes.map(id => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={mode === id}
                    className={`${styles['modeChip']}${mode === id ? ` ${styles['modeChipActive']}` : ''} nodrag`}
                    title={id === MODE_CREATIVE ? t('draft.modeCreativeHint') : t('draft.modeStandardHint')}
                    onClick={() => { setMode(id) }}
                  >
                    {id === MODE_CREATIVE ? t('draft.modeCreative') : t('draft.modeStandard')}
                  </button>
                ))}
              </div>
            </div>
          )
        : null}
      <div className={styles['draftRow']}>
        <label className={styles['draftLabel']}>{t('draft.model')}</label>
        <select
          className={`${styles['draftSelect']} nodrag`}
          value={modelKey}
          onChange={(event) => { setModelKey(event.target.value) }}
        >
          <option value="">
            {defaultModelLabel !== '' ? `${defaultModelLabel}${t('draft.defaultSuffix')}` : t('draft.default')}
          </option>
          {groups.map(group => group.models.map(model => (
            <option key={`${group.id}::${model.id}`} value={`${group.id}::${model.id}`}>
              {group.name} · {model.name}
            </option>
          )))}
        </select>
      </div>
      {presets.length > 0 && availableModes.length === 0
        ? (
            <div className={styles['draftRow']}>
              <label className={styles['draftLabel']}>{t('draft.preset')}</label>
              <select
                className={`${styles['draftSelect']} nodrag`}
                value={presetId}
                onChange={(event) => { setPresetId(event.target.value) }}
              >
                <option value="">
                  {defaultPresetLabel !== '' ? `${defaultPresetLabel}${t('draft.defaultSuffix')}` : t('draft.default')}
                </option>
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name ?? preset.id}</option>
                ))}
              </select>
            </div>
          )
        : null}
      <textarea
        ref={textareaRef}
        className={`${styles['draftTextarea']} nodrag nowheel`}
        placeholder={t('draft.placeholder')}
        value={text}
        rows={4}
        onChange={(event) => { setText(event.target.value) }}
        onKeyDown={(event) => {
          // Enter sends (Shift+Enter = newline); an IME confirmation Enter
          // (Chinese candidate pick) must never send.
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault()
            void send()
          }
        }}
      />
      {error !== undefined ? <div className={styles['spawnError']}>{error}</div> : null}
      <div className={styles['spawnActions']}>
        <button type="button" className={`${styles['spawnBtnGhost']} nodrag`} onClick={data.onClose} disabled={busy}>
          {t('spawn.cancel')}
        </button>
        <button
          type="button"
          className={`${styles['spawnBtnPrimary']} nodrag`}
          onClick={() => { void send() }}
          disabled={sendDisabled}
        >
          {busy ? t('draft.sending') : t('draft.send')}
        </button>
      </div>
    </div>
  )
}
