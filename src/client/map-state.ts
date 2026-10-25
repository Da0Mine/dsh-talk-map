/**
 * Map UI state shared between the sidebar toggle button and the overlay —
 * two components registered into unrelated slots, so they meet through this
 * module-level external store (useSyncExternalStore on the React side).
 */
import type { ConnectionService, LayoutService, SessionsService, UiWorkspaceService, WorkspacesService } from './dsh.ts'

export interface MapUiState {
  readonly open: boolean
}

type Listener = () => void

const listeners = new Set<Listener>()
let state: MapUiState = { open: false }

function emit(): void {
  for (const listener of listeners) listener()
}

/**
 * Escape routing: inner surfaces (draft card, spawn preview) claim Esc so
 * the overlay's own Esc-to-close stands down while one of them is open.
 */
const escGuards = new Set<string>()

export const mapUi = {
  get(): MapUiState {
    return state
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  /**
   * Mirror of "the map panel is the selected main panel". The panel component
   * drives it from its own mount/unmount — the shell owns the real selection.
   */
  setOpen(open: boolean): void {
    if (state.open === open) return
    state = { ...state, open }
    emit()
  },
  toggle(): void {
    if (state.open) closeMapPanel()
    else openMapPanel()
  },
  claimEscape(id: string): () => void {
    escGuards.add(id)
    return () => { escGuards.delete(id) }
  },
  escapeClaimed(): boolean {
    return escGuards.size > 0
  },
}

/**
 * Service handles captured at apply() time so components can navigate
 * (open/create sessions) without threading ctx through props.
 */
export interface MapServices {
  sessions: SessionsService
  workspaces: WorkspacesService
  connection: ConnectionService
  uiWorkspace?: UiWorkspaceService
  /** ctx.layout — panel navigation (selectPanel). */
  layout?: LayoutService
  /**
   * The client context itself, kept so services that were not registered when
   * apply() ran can still be resolved at click time (a cold boot activates this
   * plugin before ui-workspace has provided uiWorkspace).
   */
  ctx?: { get?: (name: string) => unknown }
}

/** Key of this plugin's `main` entry — the id `selectPanel` selects. */
export const MAP_PANEL_ID = 'talk-map'

let services: MapServices | undefined

export function attachServices(next: MapServices | undefined): void {
  services = next
}

export function getServices(): MapServices | undefined {
  return services
}

/**
 * uiWorkspace, resolved as late as possible: the handle cached at apply() time
 * is undefined on a cold boot, because this plugin activates before
 * ui-workspace provides the service. Resolving per call costs one lookup and
 * makes the click correct in both cases.
 */
function resolveUiWorkspace(current: MapServices): UiWorkspaceService | undefined {
  if (current.uiWorkspace !== undefined) return current.uiWorkspace
  const get = current.ctx?.get
  if (typeof get !== 'function') return undefined
  try {
    const value = get.call(current.ctx, 'uiWorkspace')
    return value === undefined || value === null ? undefined : value as UiWorkspaceService
  } catch {
    return undefined
  }
}

/**
 * One-line structural report appended to the "services still starting up"
 * failure, so a screenshot of the error is enough to see what the runtime
 * actually exposes. Temporary: remove once the cold-boot path is settled.
 */
export function servicesDiag(): string {
  const s = getServices()
  const out: string[] = [`svc=${s === undefined ? 'none' : 'ok'}`]
  try { out.push(`conn=${typeof s?.connection}`) } catch { out.push('conn=?') }
  try { out.push(`connApi=${typeof s?.connection?.api}`) } catch { out.push('connApi=?') }
  try { out.push(`ctxGet=${typeof s?.ctx?.get}`) } catch { out.push('ctxGet=?') }
  try {
    const live = s?.ctx?.get?.('connection') as { api?: unknown } | undefined
    out.push(`liveConn=${typeof live}`, `liveConnApi=${typeof live?.api}`)
  } catch { out.push('liveConn=?') }
  try {
    const ui = s?.ctx?.get?.('uiWorkspace') as { startSession?: unknown } | undefined
    out.push(`liveUi=${typeof ui}`, `uiStart=${typeof ui?.startSession}`)
  } catch { out.push('liveUi=?') }
  return out.join(' ')
}

/** uiWorkspace resolved through the live context (see resolveUiWorkspace). */
export function uiWorkspaceService(): UiWorkspaceService | undefined {
  const current = getServices()
  return current === undefined ? undefined : resolveUiWorkspace(current)
}

/** ctx.layout, resolved as late as the click (same cold-boot trap as uiWorkspace). */
function resolveLayout(current: MapServices): LayoutService | undefined {
  if (current.layout !== undefined) return current.layout
  const get = current.ctx?.get
  if (typeof get !== 'function') return undefined
  try {
    const value = get.call(current.ctx, 'layout')
    return value === undefined || value === null ? undefined : value as LayoutService
  } catch {
    return undefined
  }
}

/**
 * Show the map in the centre column (`main` panel), the way the recycle bin or
 * the Plugins page do — a window over the conversation, not a frame-wide cover.
 * The shell keeps the current Session as the *previous* view, so a session that
 * finishes while the map is up still counts as unread and can glow.
 */
export function openMapPanel(): void {
  const current = getServices()
  const layout = current === undefined ? undefined : resolveLayout(current)
  if (layout === undefined) {
    mapUi.setOpen(true)
    return
  }
  try {
    layout.selectPanel(MAP_PANEL_ID)
  } catch (error) {
    console.error('[dsh-talk-map] selectPanel failed:', error)
    mapUi.setOpen(true)
  }
}

/** Back to the conversation (the shell's own "show the Session" selection). */
export function closeMapPanel(): void {
  const current = getServices()
  const layout = current === undefined ? undefined : resolveLayout(current)
  if (layout === undefined) {
    mapUi.setOpen(false)
    return
  }
  try {
    layout.selectPanel(null)
  } catch (error) {
    console.error('[dsh-talk-map] selectPanel(null) failed:', error)
    mapUi.setOpen(false)
  }
}

/**
 * The RPC client behind `connection`, resolved as late as the click.
 *
 * `connection` is injected, but the object cached at apply() time can be a
 * pre-connection instance whose `.api` never appears — the same cold-boot trap
 * as uiWorkspace, which showed up as "界面服务还在初始化" on the map's draft card.
 */
export function connectionApi(): ConnectionService['api'] | undefined {
  const current = getServices()
  if (current === undefined) return undefined
  const direct = current.connection?.api
  if (direct !== undefined) return direct
  const get = current.ctx?.get
  if (typeof get !== 'function') return undefined
  try {
    const live = get.call(current.ctx, 'connection') as ConnectionService | undefined
    return live?.api
  } catch {
    return undefined
  }
}

/**
 * Session navigation. DSH's client runtime moved "open this session in the main
 * view" onto `ctx.uiWorkspace.openSession`; older builds carried
 * `ctx.sessions.open`. Probe both, and never swallow the failure silently: a
 * missing or throwing call used to close the map and leave the previous
 * conversation on screen with nothing to explain it.
 *
 * @returns whether a navigation call was issued.
 */
export function openSessionInUi(sessionId: string): boolean {
  const current = getServices()
  if (current === undefined) return false
  try {
    const ui = resolveUiWorkspace(current)
    if (ui !== undefined && typeof ui.openSession === 'function') {
      ui.openSession(sessionId)
      return true
    }
    if (typeof current.sessions.open === 'function') {
      current.sessions.open(sessionId)
      return true
    }
  } catch (error) {
    console.error('[dsh-talk-map] opening session failed:', sessionId, error)
    return false
  }
  console.error('[dsh-talk-map] this DSH build exposes no session navigation service; cannot open', sessionId)
  return false
}

/** Fork a Session through the Workspace service when the runtime has it. */
export function forkSessionInUi(sessionId: string): Promise<string> {
  const current = getServices()
  if (current === undefined) return Promise.reject(new Error('dsh-talk-map: services are not attached'))
  const ui = resolveUiWorkspace(current)
  if (ui !== undefined && typeof ui.forkSession === 'function') return ui.forkSession(sessionId)
  if (typeof current.sessions.fork === 'function') return current.sessions.fork({ sessionId, increaseTitle: true })
  return Promise.reject(new Error('dsh-talk-map: this DSH build exposes no fork API'))
}
