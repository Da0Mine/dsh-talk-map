/**
 * dsh-talk-map, browser half: one sidebar footer action (toggle) plus one
 * shell.overlay entry (the map itself). Both ride ctx.slots.inject, so the
 * registrations wait for their slots to exist and unwind on plugin unload.
 *
 * Failure policy: apply() must never throw — the web shell fails the whole
 * boot when a plugin apply throws, and an external plugin must not take the
 * GUI down (policy proven by dsh-plugin-market).
 */
import type { AlertSource, LayoutService, TalkMapClientContext, UiWorkspaceService } from './dsh.ts'
import { canvas } from './canvas-store.ts'
import { DEFAULT_HOTKEY, hotkeyMatches } from './hotkey.ts'
import { attachServices, mapUi, MAP_PANEL_ID } from './map-state.ts'
import { MapOverlay } from './MapOverlay.tsx'
import { MapToggleButton } from './MapToggleButton.tsx'
import { attachAlertSource } from './session-alerts.ts'
import { t } from './i18n.ts'

/**
 * ctx.uiWorkspace carries the real session opener. It is not in `inject` so a
 * leaner runtime cannot keep the whole map from mounting; reach it directly when
 * cordis exposes the service, otherwise through ctx.get().
 */
function resolveUiWorkspace(ctx: TalkMapClientContext): UiWorkspaceService | undefined {
  try {
    const direct = ctx.uiWorkspace
    if (direct !== undefined) return direct
  } catch {
    // Not registered yet: fall through to the optional lookup.
  }
  try {
    const value = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
    return value === undefined || value === null ? undefined : value as UiWorkspaceService
  } catch {
    return undefined
  }
}

/** ctx.layout — panel navigation; reached the same way as uiWorkspace. */
function resolveLayout(ctx: TalkMapClientContext): LayoutService | undefined {
  try {
    const direct = ctx.layout
    if (direct !== undefined) return direct
  } catch {
    // Not registered yet: fall through to the optional lookup.
  }
  try {
    const value = typeof ctx.get === 'function' ? ctx.get('layout') : undefined
    return value === undefined || value === null ? undefined : value as LayoutService
  } catch {
    return undefined
  }
}

/** ctx.remote carries the Host event stream; reached the same way as uiWorkspace. */
function resolveRemote(ctx: TalkMapClientContext): AlertSource | undefined {
  try {
    const direct = ctx.remote
    if (direct !== undefined) return direct
  } catch {
    // Not registered yet: fall through to the optional lookup.
  }
  try {
    const value = typeof ctx.get === 'function' ? ctx.get('remote') : undefined
    return value === undefined || value === null ? undefined : value as AlertSource
  } catch {
    return undefined
  }
}

export const name = 'dsh-talk-map'
export const inject = ['slots', 'sessions', 'workspaces', 'connection']

let applied = false

export function apply(ctx: TalkMapClientContext): void {
  // A duplicated client injection (module factory executed twice in one page
  // lifetime) would otherwise register a second button and overlay.
  if (applied) return
  applied = true
  ctx.effect(() => () => { applied = false }, 'dsh-talk-map: apply claim')

  try {
    attachServices({
      sessions: ctx.sessions,
      workspaces: ctx.workspaces,
      connection: ctx.connection,
      uiWorkspace: resolveUiWorkspace(ctx),
      layout: resolveLayout(ctx),
      // Also kept live: a cold boot reaches this plugin before ui-workspace
      // registers, so the click resolves the service through ctx instead.
      ctx: { get: typeof ctx.get === 'function' ? (name: string) => ctx.get?.(name) : undefined },
    })
    ctx.effect(() => () => { attachServices(undefined) }, 'dsh-talk-map: services')

    // Cold boot: this plugin activates before `connection` has its api and
    // before ui-workspace provides uiWorkspace. cordis re-runs an inject
    // callback once those services exist, so the map can swap in the live
    // handles instead of keeping a pre-connection stub forever.
    if (typeof ctx.inject === 'function') {
      try {
        ctx.inject(['connection', 'uiWorkspace'], (scoped) => {
          attachServices({
            sessions: ctx.sessions,
            workspaces: ctx.workspaces,
            connection: scoped.connection ?? ctx.connection,
            uiWorkspace: scoped.uiWorkspace,
            layout: resolveLayout(scoped),
            ctx: { get: typeof scoped.get === 'function' ? (name: string) => scoped.get?.(name) : undefined },
          })
        })
      } catch (error) {
        console.error('[dsh-talk-map] late service binding failed:', error)
      }
    }

    // Failure lamps: the Host's api-session/error stream, kept until the
    // session runs again or is opened. Wrapped because apply() runs during a
    // hot reload too: any throw here fails this client entry's activation and
    // takes the whole web boot down ("1 entry did not activate"), which is a
    // far worse outcome than losing a lamp.
    ctx.effect(() => {
      try {
        return attachAlertSource(resolveRemote(ctx), ctx.sessions.list)
      } catch (error) {
        console.error('[dsh-talk-map] session alerts unavailable:', error)
        return () => {}
      }
    }, 'dsh-talk-map: session alerts')

    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'talk-map',
      order: 10,
      label: () => t('map.toggle'),
    }, MapToggleButton))

    // The map is an ordinary `main` panel (the seat the Plugins page, the map's
    // recycle-bin neighbour and the Plugin Market use), NOT a frame-wide
    // overlay. Two consequences that matter here:
    //   - it reads as a window over the conversation, with the sidebar live;
    //   - with a panel selected and no Session on screen, a session that
    //     finishes is still "unread", so its card can glow (the overlay used to
    //     keep the old conversation mounted, which silently acknowledged it).
    ctx.slots.inject('main', () => ctx.slots.register({
      name: 'main',
      key: MAP_PANEL_ID,
      label: () => t('map.title'),
    }, MapOverlay))

    // Toggle hotkey (default ⌥F, user-configurable in the map header).
    // preventDefault stops macOS from typing the dead character (ƒ etc.)
    // into a focused composer. State loads early so the custom binding is
    // live before the map is first opened.
    canvas.ensureLoaded()
    ctx.effect(() => {
      const onKeyDown = (event: KeyboardEvent): void => {
        const hotkey = canvas.get().global?.hotkey ?? DEFAULT_HOTKEY
        if (hotkeyMatches(event, hotkey)) {
          event.preventDefault()
          event.stopPropagation()
          mapUi.toggle()
        }
      }
      window.addEventListener('keydown', onKeyDown, { capture: true })
      return () => { window.removeEventListener('keydown', onKeyDown, { capture: true }) }
    }, 'dsh-talk-map: toggle hotkey')
  } catch (error) {
    console.error('[dsh-talk-map] client apply failed:', error)
  }
}
