/**
 * The board. Import-based: nothing lands here automatically — the user
 * imports a workspace (frame + its sessions as cards), imports single
 * conversations, or creates new ones on the canvas (draft card / fork edge).
 *
 * Cards drag freely; a group's frame is derived from its members and
 * stretches after them. Dragging the frame (label chip or border) carries
 * every member. Membership MIRRORS the sidebar: dsh binds a session to the
 * workspace whose directory it works in (immutable cwd), so the map offers
 * no group-moving — what the sidebar cannot do, the map does not pretend to.
 *
 * Interaction: right/middle-drag pans, plain right-click opens the context
 * menu, left-drag box-selects on the pane and drags nodes.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  Background, BackgroundVariant, ConnectionMode, ControlButton, Controls, ReactFlow, ReactFlowProvider,
  SelectionMode, useReactFlow, type Connection, type Edge, type EdgeChange, type FinalConnectionState,
  type NodeChange, type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { RootSlotStandardProps, SessionListState, SessionStatusFact, WorkspaceListState } from './dsh.ts'
import type { Card, FrameGeometry } from '../shared/model.ts'
import { canvas, INBOX_BOARD_ID, newCardId, type CanvasState } from './canvas-store.ts'
import { COLOR_TAGS } from './colors.ts'
import { buildPushText, digestIsEmpty } from './digest-text.ts'
import { closeMapPanel, connectionApi, getServices, mapUi, openSessionInUi } from './map-state.ts'
import { sessionAlerts } from './session-alerts.ts'
import { ContextMenu, type MenuItem, type MenuState } from './ContextMenu.tsx'
import { DraftCardNode, type DraftCardNodeType } from './DraftCard.tsx'
import { SessionCardNode, type SessionCardData, type SessionCardNodeType } from './SessionCard.tsx'
import { SpawnPreview, type PendingSpawn } from './SpawnPreview.tsx'
import { WsFrameNode, type ResizeAxis, type WsFrameNodeType } from './WsFrame.tsx'
import { activeLocale, subscribeLocale, t } from './i18n.ts'
import { talkMapApi, type ApiError } from './api.ts'
import {
  CARD_H, CARD_W, FRAME_LABEL_H, FRAME_PAD, GAP_X, GAP_Y,
  frameRect, layoutFor, type SlotEntry,
} from './grid-layout.ts'
import { useDsDarkTheme } from './use-dark.ts'
import styles from './talk-map.module.css'

const nodeTypes = { sessionCard: SessionCardNode, wsFrame: WsFrameNode, draftCard: DraftCardNode }

const GRID = 16
const COLS = 3
/** v4: frames became user-sized containers with slot layout inside. */
const LAYOUT_VERSION = 4

type TalkMapNode = SessionCardNodeType | WsFrameNodeType | DraftCardNodeType

/** Stable empty projection for a runtime without the ui-session status hook. */
const EMPTY_SESSION_STATUS: ReadonlyMap<string, SessionStatusFact> = new Map()

function snap(value: number): number {
  return Math.round(value / GRID) * GRID
}

/** Sessions eligible for a card: top-level, non-empty logs. */
function placeableSessionIds(sessions: SessionListState): string[] {
  return sessions.ids.filter((id) => {
    const summary = sessions.byId[id]
    return summary !== undefined && !summary.blank && summary.origin !== 'subagent'
  })
}

function sessionWorkspaceIndex(workspaces: WorkspaceListState): Map<string, string> {
  const index = new Map<string, string>()
  for (const workspace of workspaces.items) {
    for (const sessionId of workspace.sessionIds) index.set(sessionId, workspace.workspaceId)
  }
  return index
}

function gridPosition(origin: { x: number; y: number }, index: number): { x: number; y: number } {
  const column = index % COLS
  const row = Math.floor(index / COLS)
  return {
    x: snap(origin.x + column * (CARD_W + GAP_X)),
    y: snap(origin.y + row * (CARD_H + GAP_Y)),
  }
}

/** Frame rect that fits a set of member cards. */
function fitRect(members: Card[]): FrameGeometry {
  const minX = Math.min(...members.map(card => card.x))
  const minY = Math.min(...members.map(card => card.y))
  const maxX = Math.max(...members.map(card => card.x + CARD_W))
  const maxY = Math.max(...members.map(card => card.y + CARD_H))
  return {
    x: minX - FRAME_PAD,
    y: minY - FRAME_PAD - FRAME_LABEL_H,
    width: maxX - minX + FRAME_PAD * 2,
    height: maxY - minY + FRAME_PAD * 2 + FRAME_LABEL_H,
  }
}


interface DraftState {
  x: number
  y: number
  workspaceId?: string
  groupId?: string
}

interface MenuContext {
  left: number
  top: number
  flowX: number
  flowY: number
  kind: 'pane' | 'card' | 'frame' | 'edge'
  targetId?: string
  /** Edge menus: endpoint card ids (set for stored AND lineage edges). */
  edgeFrom?: string
  edgeTo?: string
  view: 'root' | 'import-ws' | 'import-session' | 'new-ws'
}

function CanvasInner(props: RootSlotStandardProps): React.JSX.Element {
  const dark = useDsDarkTheme()
  const canvasState = useSyncExternalStore(canvas.subscribe, canvas.get)
  const sessions = props.useSessions(state => state)
  const workspaces = props.useWorkspaces(state => state)
  // ui-session's own projection. The session list rows expose no completion
  // flag, so "ran to the end while you were looking elsewhere" lives here.
  const statusById = typeof props.useSessionStatus === 'function'
    ? props.useSessionStatus(status => status)
    : EMPTY_SESSION_STATUS
  const alertById = useSyncExternalStore(sessionAlerts.subscribe, sessionAlerts.getSnapshot)
  const { screenToFlowPosition, zoomTo } = useReactFlow()
  // 2026-10-24 补丁：默认左键拖拽平移，左下角控件面板可切回框选
  const [panMode, setPanMode] = useState(true)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<ReadonlySet<string>>(new Set())
  // Connection drag in flight → every card shows its (otherwise hidden)
  // connection points, so drop targets are visible.
  const [connecting, setConnecting] = useState(false)
  // Esc pressed mid-drag: swallow the following release so the spawn panel
  // does not pop on a gesture the user just cancelled.
  const connectCancelledRef = useRef(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [pendingSpawn, setPendingSpawn] = useState<PendingSpawn | null>(null)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [menu, setMenu] = useState<MenuContext | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  // Slot layout bookkeeping: the card under the pointer renders at its raw
  // drag position (everything else is snapped), and a frame being moved or
  // resized contributes a live rect that the members reflow into before the
  // gesture commits.
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [liveFrame, setLiveFrame] = useState<{ groupId: string; rect: FrameGeometry } | null>(null)
  // While a rubber-band drag is running, the node/edge arrays are frozen:
  // a mid-drag data refresh (digest SSE, running-state flip) re-renders the
  // flow and corrupts React Flow's in-flight hit testing — the intermittent
  // "one small box selects everything / selects nothing" reports.
  const [isSelecting, setIsSelecting] = useState(false)
  const frozenRef = useRef<{ nodes: TalkMapNode[]; edges: Edge[] } | null>(null)

  // Copy inside React Flow nodes is memoised by the flow itself, so a
  // language switch has to invalidate the memos that build them — hence
  // `locale` in their dependency lists below.
  const locale = useSyncExternalStore(subscribeLocale, activeLocale, activeLocale)

  const sessionWs = useMemo(() => sessionWorkspaceIndex(workspaces), [workspaces])
  const wsTitles = useMemo(
    () => new Map(workspaces.items.map(item => [item.workspaceId, item.title])),
    [workspaces],
  )
  const workspacesReady = workspaces.baselinesReady !== false

  const wsFrames = canvasState.global?.wsFrames ?? {}
  const layoutVersion = canvasState.global?.layoutVersion ?? 1

  // Migration to the folder world (v4): every group that has cards but no
  // stored rect gets one built around its current cards, so the layout engine
  // has a folder to arrange inside. Cards keep their reading order (the slot
  // assignment is derived from their current positions), and the reconciliation
  // effect below snaps them onto slots.
  useEffect(() => {
    if (canvasState.phase !== 'ready' || layoutVersion >= LAYOUT_VERSION || !workspacesReady) return
    const byGroup = new Map<string, Card[]>()
    for (const card of Object.values(canvasState.cards)) {
      const groupId = sessionWs.get(card.sessionId)
      if (groupId === undefined) continue
      byGroup.set(groupId, [...byGroup.get(groupId) ?? [], card])
    }
    const framesNext = { ...canvasState.global?.wsFrames }
    for (const [groupId, members] of byGroup) {
      const stored = framesNext[groupId]
      if (stored === undefined && members.length > 0) {
        framesNext[groupId] = fitRect(members)
      } else if (stored !== undefined) {
        // A rect left over from the derived-frame era can be wider than the
        // cards need; the slot layout re-derives it from the member count.
        framesNext[groupId] = frameRect(stored, members.length)
      }
    }
    canvas.patchGlobalNow({ layoutVersion: LAYOUT_VERSION, wsFrames: framesNext })
  }, [canvasState.phase, layoutVersion, workspacesReady, canvasState.cards, canvasState.global, sessionWs])

  // Cards pointing at blank (empty-log) sessions are noise.
  const visibleCards = useMemo(() => {
    const out: Record<string, Card> = {}
    for (const [cardId, card] of Object.entries(canvasState.cards)) {
      if (sessions.byId[card.sessionId]?.blank === true) continue
      out[cardId] = card
    }
    return out
  }, [canvasState.cards, sessions])

  // Membership mirrors the sidebar truth: a card belongs to its session's
  // real workspace (dsh binds that to the session's cwd; sessions cannot
  // move between workspaces, so neither do cards between frames).
  const membersByGroup = useMemo(() => {
    const index = new Map<string, string[]>()
    for (const [cardId, card] of Object.entries(visibleCards)) {
      const groupId = sessionWs.get(card.sessionId)
      if (groupId === undefined) continue
      index.set(groupId, [...index.get(groupId) ?? [], cardId])
    }
    return index
  }, [visibleCards, sessionWs])

  // Folder geometry as rendered: the stored rect (the user's wish, clamped to
  // one column and to the height its cards need) with a live gesture rect on
  // top while a frame is being moved or resized.
  const frameRects = useMemo(() => {
    const out: Record<string, FrameGeometry> = {}
    for (const [groupId, stored] of Object.entries(wsFrames)) {
      const count = (membersByGroup.get(groupId) ?? []).length
      const base = liveFrame !== null && liveFrame.groupId === groupId ? liveFrame.rect : stored
      out[groupId] = frameRect(base, count)
    }
    return out
  }, [wsFrames, membersByGroup, liveFrame])

  // Slot positions for every card that lives in a folder, ordered by recency:
  // the freshest conversation takes the first slot, so "newest" is always the
  // top-left card. Positions are derived, never stored-and-trusted: that is
  // what makes a resize reflow and a removal close the gap.
  const cardLayout = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {}
    for (const [groupId, rect] of Object.entries(frameRects)) {
      const members = (membersByGroup.get(groupId) ?? [])
        .map((cardId): SlotEntry | undefined => {
          const card = visibleCards[cardId]
          if (card === undefined) return undefined
          return { cardId, time: sessions.byId[card.sessionId]?.updatedAt ?? card.createdAt }
        })
        .filter((entry): entry is SlotEntry => entry !== undefined)
      for (const [cardId, point] of Object.entries(layoutFor(rect, members))) out[cardId] = point
    }
    return out
  }, [frameRects, membersByGroup, visibleCards, sessions])

  // Persist the derived arrangement whenever it drifts from the store: a card
  // was added, removed, dropped somewhere else, or a folder changed shape. The
  // write is skipped mid-gesture (the dragged card's position IS the gesture)
  // and is a no-op once everything matches, so it cannot loop.
  useEffect(() => {
    if (canvasState.phase !== 'ready') return
    if (draggingCardId !== null || liveFrame !== null) return
    const stale: Record<string, { x: number; y: number }> = {}
    for (const [cardId, point] of Object.entries(cardLayout)) {
      const card = canvasState.cards[cardId]
      if (card === undefined) continue
      if (card.x !== point.x || card.y !== point.y) stale[cardId] = point
    }
    if (Object.keys(stale).length > 0) canvas.moveCards(stale)
  }, [cardLayout, canvasState.cards, canvasState.phase, draggingCardId, liveFrame])

  // While a connection drag is live, Esc belongs to it. React Flow (this
  // @xyflow version) has NO Escape handling of its own and exposes no
  // cancelConnection API — the ghost line follows the pointer until
  // release regardless. So Esc only arms the cancel flag; the drag state
  // (handles revealed, Esc claimed) deliberately survives until pointerup,
  // matching the still-visible ghost line and keeping a second Esc from
  // falling through to the overlay and closing the map. onConnect and
  // onConnectEnd both honor the flag, so a cancelled gesture creates
  // nothing no matter where it is released.
  useEffect(() => {
    if (!connecting) return
    const release = mapUi.claimEscape('connecting')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') connectCancelledRef.current = true
    }
    // pointercancel/blur too: a gesture the browser aborts (system touch
    // gesture, tab switch) never produces a pointerup, and a connecting
    // state that cannot exit would hold the Esc claim forever.
    const onGestureEnd = (): void => { setConnecting(false) }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('pointerup', onGestureEnd, { capture: true })
    window.addEventListener('pointercancel', onGestureEnd, { capture: true })
    window.addEventListener('blur', onGestureEnd)
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('pointerup', onGestureEnd, { capture: true })
      window.removeEventListener('pointercancel', onGestureEnd, { capture: true })
      window.removeEventListener('blur', onGestureEnd)
      release()
    }
  }, [connecting])

  // Cmd/Ctrl+Z undoes board operations (Shift redoes); text fields keep
  // their native undo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.code !== 'KeyZ') return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]') !== null && target !== null) return
      event.preventDefault()
      event.stopPropagation()
      if (event.shiftKey) canvas.redo()
      else canvas.undo()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => { window.removeEventListener('keydown', onKeyDown, { capture: true }) }
  }, [])

  // With a selection active, Esc clears it instead of closing the map, and
  // Backspace/Delete removes selected FRAMES (React Flow no longer owns
  // frame selection, so its deleteKeyCode cannot reach them; cards stay on
  // the React Flow path).
  // Selection ids can go stale without a select:false ever firing — the
  // context menu and SSE delete straight from the store, and React Flow
  // emits no change for an element that simply vanished from a controlled
  // array. These existence-filtered sets are the ONLY selection surface
  // consumers may read (Backspace, the color toolbar, node/edge selected
  // flags): a dead id must neither pin hasSelection (swallowing Escape)
  // nor let an action fire against a deleted frame or card. Cards are
  // judged against visibleCards — a session turning blank drops its card
  // from the canvas while it lingers in the store.
  const liveSelectedIds = useMemo(() => {
    const next = new Set<string>()
    for (const id of selectedIds) {
      if (id.startsWith('frame-')) {
        if (wsFrames[id.slice('frame-'.length)] !== undefined) next.add(id)
      } else if (visibleCards[id] !== undefined) {
        next.add(id)
      }
    }
    return next
  }, [selectedIds, visibleCards, wsFrames])
  const liveSelectedEdgeIds = useMemo(() => {
    const next = new Set<string>()
    for (const id of selectedEdgeIds) {
      if (canvasState.edges[id] !== undefined) next.add(id)
    }
    return next
  }, [selectedEdgeIds, canvasState.edges])
  const hasSelection = liveSelectedIds.size > 0 || liveSelectedEdgeIds.size > 0
  useEffect(() => {
    if (!hasSelection) return
    const release = mapUi.claimEscape('selection')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setSelectedIds(new Set())
        setSelectedEdgeIds(new Set())
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        const target = event.target as HTMLElement | null
        if (target !== null && target.closest('input, textarea, [contenteditable="true"]') !== null) return
        const frameIds = [...liveSelectedIds].filter(id => id.startsWith('frame-'))
        if (frameIds.length === 0) return
        for (const frameId of frameIds) removeGroup(frameId.slice('frame-'.length))
        setSelectedIds((previous) => {
          const next = new Set(previous)
          for (const frameId of frameIds) next.delete(frameId)
          return next
        })
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      release()
    }
  })

  /**
   * Resize a folder. Screen-space pointer deltas become flow-space growth, the
   * members reflow live into the new width (that is the whole point of a
   * container), and only the release persists the rect.
   */
  const beginResize = (groupId: string, axis: ResizeAxis, event: React.PointerEvent<HTMLDivElement>): void => {
    const start = frameRects[groupId] ?? wsFrames[groupId]
    if (start === undefined) return
    const origin = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const count = (membersByGroup.get(groupId) ?? []).length
    let next: FrameGeometry = { ...start }
    const onMove = (moveEvent: PointerEvent): void => {
      const now = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY })
      const dx = now.x - origin.x
      const dy = now.y - origin.y
      next = {
        x: start.x,
        y: start.y,
        width: axis === 's' ? start.width : start.width + dx,
        height: axis === 'e' ? start.height : start.height + dy,
      }
      setLiveFrame({ groupId, rect: next })
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setLiveFrame(null)
      canvas.setWsFrameRect(groupId, frameRect(next, count))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const liveNodes = useMemo<TalkMapNode[]>(() => {
    const wsColors = canvasState.global?.wsColors ?? {}
    const frameNodes: TalkMapNode[] = Object.entries(frameRects).map(([groupId, rect]) => {
      const members = membersByGroup.get(groupId) ?? []
      return {
        id: `frame-${groupId}`,
        type: 'wsFrame' as const,
        position: { x: rect.x, y: rect.y },
        data: {
          workspaceId: groupId,
          title: wsTitles.get(groupId) ?? t('frame.unknown'),
          count: members.length,
          width: rect.width,
          height: rect.height,
          ...(wsColors[groupId] !== undefined ? { colorTag: wsColors[groupId] } : {}),
          onResizeStart: (axis: ResizeAxis, event: React.PointerEvent<HTMLDivElement>) => {
            beginResize(groupId, axis, event)
          },
        },
        draggable: true,
        // NOT selectable by React Flow: rubber-band selection grows in
        // batches and would sweep the huge frames in. Frame selection is
        // click-only, managed by this component (onNodeClick).
        selectable: false,
        focusable: false,
        selected: liveSelectedIds.has(`frame-${groupId}`),
        zIndex: -1,
        // Folders no longer eat pointer events: the body has to stay
        // transparent so a double-click inside it reaches the pane (that is
        // "new chat in this workspace"). The label and border strips are the
        // frame's own physical surfaces and keep their own pointer events.
        style: { pointerEvents: 'none' as const },
      }
    })
    const cardNodes: TalkMapNode[] = Object.entries(visibleCards)
      .filter(([, card]) => card.boardId === INBOX_BOARD_ID)
      .map(([cardId, card]) => {
        const summary = sessions.byId[card.sessionId]
        const digest = canvasState.digests[card.sessionId]
        const status = statusById.get(card.sessionId)
        const slot = cardLayout[cardId]
        const dragging = draggingCardId === cardId
        const data: SessionCardData = {
          cardId,
          sessionId: card.sessionId,
          title: summary?.displayTitle ?? card.sessionId,
          running: status?.running ?? summary?.running ?? false,
          ghost: summary === undefined,
          updatedAt: summary?.updatedAt,
          nextStep: digest?.nextStep ?? digest?.todoNext,
          summary: digest?.summary,
          waiting: status !== undefined ? status.pendingInteraction !== undefined : summary?.pendingInteraction !== undefined,
          done: status?.completionUnread === true,
          // One lamp per card, most urgent first: a failure must not be hidden
          // behind a "finished" glow, and being blocked on the user outranks
          // merely still running.
          glow: alertById.has(card.sessionId)
            ? 'error'
            : status !== undefined && status.pendingInteraction !== undefined
              ? 'waiting'
              : status?.running === true || summary?.running === true
                ? 'running'
                : status?.completionUnread === true
                  ? 'done'
                  : undefined,
          ...(card.colorTag !== undefined ? { colorTag: card.colorTag } : {}),
        }
        return {
          id: cardId,
          type: 'sessionCard' as const,
          // The dragged card follows the pointer; every other card sits on its
          // slot (and glides there — the CSS transition owns the animation).
          position: dragging || slot === undefined ? { x: card.x, y: card.y } : { x: slot.x, y: slot.y },
          selected: liveSelectedIds.has(cardId),
          className: dragging ? 'tmDragging' : '',
          data,
        }
      })
    const draftNodes: TalkMapNode[] = draft === null
      ? []
      : [{
          id: 'draft',
          type: 'draftCard' as const,
          position: { x: draft.x, y: draft.y },
          selectable: false,
          zIndex: 10,
          data: {
            workspaceOptions: workspaces.items.map(item => ({
              id: item.workspaceId,
              title: item.title,
              path: item.path,
            })),
            ...(draft.workspaceId !== undefined ? { defaultWorkspaceId: draft.workspaceId } : {}),
            ...(draft.groupId !== undefined ? { groupId: draft.groupId } : {}),
            onClose: () => { setDraft(null) },
          },
        }]
    return [...frameNodes, ...cardNodes, ...draftNodes]
  }, [frameRects, cardLayout, draggingCardId, membersByGroup, wsTitles, visibleCards, canvasState.digests, canvasState.global, sessions, statusById, alertById, liveSelectedIds, draft, workspaces.items, locale])

  const sessionIdToCardId = useMemo(() => {
    const index = new Map<string, string>()
    for (const [cardId, card] of Object.entries(visibleCards)) {
      if (!index.has(card.sessionId)) index.set(card.sessionId, cardId)
    }
    return index
  }, [visibleCards])

  const liveEdges = useMemo<Edge[]>(() => {
    const out: Edge[] = []
    const present = new Set(Object.keys(visibleCards))
    // Card pairs with an explicit user-drawn edge, registered in BOTH
    // directions: the derived lineage dashes yield to a stored edge no
    // matter which way it was drawn — otherwise the two lines overlap on
    // the same handles and a deleted edge looks like it survived.
    const explicitPairs = new Set<string>()
    for (const [edgeId, edge] of Object.entries(canvasState.edges)) {
      explicitPairs.add(`${edge.fromCardId}->${edge.toCardId}`)
      explicitPairs.add(`${edge.toCardId}->${edge.fromCardId}`)
      if (!present.has(edge.fromCardId) || !present.has(edge.toCardId)) continue
      const kind = edge.injection.kind
      out.push({
        id: edgeId,
        source: edge.fromCardId,
        target: edge.toCardId,
        // Handles stored per edge; legacy edges keep their old r→l anchoring.
        sourceHandle: edge.fromHandle ?? 'r',
        targetHandle: edge.toHandle ?? 'l',
        type: 'smoothstep',
        selected: liveSelectedEdgeIds.has(edgeId),
        // Endpoints ride along for the edge context menu (id parsing would
        // be ambiguous — card ids contain dashes).
        data: { fromCardId: edge.fromCardId, toCardId: edge.toCardId },
        // Pure association lines: no label, lighter than injection edges.
        ...(kind === 'link'
          ? { style: { opacity: 0.4 } }
          : {
              label: kind === 'none'
                ? t('edge.none')
                : kind === 'full'
                  ? t('edge.full')
                  : t('edge.injected'),
              ...(kind === 'none' ? { style: { opacity: 0.65 } } : {}),
            }),
      })
    }
    for (const [cardId, card] of Object.entries(visibleCards)) {
      const parentSessionId = sessions.byId[card.sessionId]?.parentId
      if (parentSessionId === undefined) continue
      const parentCardId = sessionIdToCardId.get(parentSessionId)
      if (parentCardId === undefined) continue
      if (explicitPairs.has(`${parentCardId}->${cardId}`)) continue
      out.push({
        id: `lineage-${parentCardId}-${cardId}`,
        source: parentCardId,
        target: cardId,
        sourceHandle: 'r',
        targetHandle: 'l',
        type: 'smoothstep',
        selectable: false,
        data: { fromCardId: parentCardId, toCardId: cardId },
        style: { strokeDasharray: '6 4', opacity: 0.5 },
      })
    }
    return out
  }, [visibleCards, canvasState.edges, sessions, sessionIdToCardId, liveSelectedEdgeIds, locale])

  const nodes = isSelecting && frozenRef.current !== null ? frozenRef.current.nodes : liveNodes
  const edges = isSelecting && frozenRef.current !== null ? frozenRef.current.edges : liveEdges

  const onSelectionStart = (): void => {
    frozenRef.current = { nodes: liveNodes, edges: liveEdges }
    setIsSelecting(true)
  }
  const onSelectionEnd = (): void => {
    frozenRef.current = null
    setIsSelecting(false)
  }

  const onNodesChange = (changes: NodeChange<TalkMapNode>[]): void => {
    const removedCardIds = changes
      .filter((change): change is Extract<NodeChange<TalkMapNode>, { type: 'remove' }> => change.type === 'remove')
      .map(change => change.id)
      .filter(id => !id.startsWith('frame-') && id !== 'draft')
    for (const change of changes) {
      if (change.type === 'position' && change.position !== undefined) {
        if (change.id === 'draft') {
          setDraft(previous => previous === null
            ? previous
            : { ...previous, x: change.position?.x ?? previous.x, y: change.position?.y ?? previous.y })
        } else if (change.id.startsWith('frame-')) {
          // Moving a folder: the members are not translated card by card any
          // more — their slots are derived from the folder's rect, so a live
          // rect moves (and animates) the whole group in one pass.
          const groupId = change.id.slice('frame-'.length)
          const base = frameRects[groupId] ?? wsFrames[groupId]
          if (base === undefined) continue
          const rect: FrameGeometry = {
            x: change.position.x,
            y: change.position.y,
            width: base.width,
            height: base.height,
          }
          if (change.dragging === false) {
            setLiveFrame(null)
            canvas.setWsFrameRect(groupId, rect)
          } else if (change.dragging === true) {
            setLiveFrame({ groupId, rect })
          }
        } else if (change.dragging === false) {
          // Dropped. Slot order is recency, not position, so the card glides
          // back to its own slot: clearing the drag flag is enough — the
          // reconciliation effect rewrites the position it was dragged away
          // from, and nothing else has to move.
          setDraggingCardId(null)
        } else if (change.dragging === true) {
          // Live drag — this card is the only one that ignores its slot.
          setDraggingCardId(change.id)
          canvas.moveCard(change.id, change.position.x, change.position.y)
        }
      } else if (change.type === 'select') {
        setSelectedIds((previous) => {
          const next = new Set(previous)
          if (change.selected) next.add(change.id)
          else next.delete(change.id)
          return next
        })
      } else if (change.type === 'remove') {
        // Backspace/Delete on a selection (React Flow ignores focused inputs).
        // Cards leave the map (the session itself is untouched); a frame
        // removal takes its member cards with it — same as the context menu.
        if (change.id.startsWith('frame-')) {
          removeGroup(change.id.slice('frame-'.length))
        } else if (change.id !== 'draft') {
          canvas.removeCard(change.id)
        }
        setSelectedIds((previous) => {
          const next = new Set(previous)
          next.delete(change.id)
          return next
        })
      }
    }
    // AFTER the removals (and after the first removeCard pushed the undo
    // snapshot with frames intact): a batch that emptied a group takes the
    // group's now-empty frame with it — rubber-band can't select frames, so
    // "select everything and Backspace" must not leave empty shells behind.
    if (removedCardIds.length > 0) {
      const touched = new Set<string>()
      for (const cardId of removedCardIds) {
        const card = canvasState.cards[cardId]
        const groupId = card !== undefined ? sessionWs.get(card.sessionId) : undefined
        if (groupId !== undefined) touched.add(groupId)
      }
      const framesNext = { ...wsFrames }
      let framesChanged = false
      for (const groupId of touched) {
        const remaining = (membersByGroup.get(groupId) ?? []).filter(id => !removedCardIds.includes(id))
        if (remaining.length === 0 && framesNext[groupId] !== undefined) {
          delete framesNext[groupId]
          framesChanged = true
        }
      }
      // wsColors is deliberately kept: a re-import brings the color back.
      if (framesChanged) canvas.patchGlobalNow({ wsFrames: framesNext })
    }
  }

  const onEdgesChange = (changes: EdgeChange[]): void => {
    // Removals batch into ONE store call: a hub card's Backspace emits one
    // remove per connected edge, and per-edge calls would mean one undo
    // frame, one state copy, and one POST each.
    const removedIds: string[] = []
    for (const change of changes) {
      if (change.type === 'select') {
        setSelectedEdgeIds((previous) => {
          const next = new Set(previous)
          if (change.selected) next.add(change.id)
          else next.delete(change.id)
          return next
        })
      } else if (change.type === 'remove') {
        // Lineage edges are derived — nothing to delete.
        if (!change.id.startsWith('lineage-')) removedIds.push(change.id)
        setSelectedEdgeIds((previous) => {
          const next = new Set(previous)
          next.delete(change.id)
          return next
        })
      }
    }
    if (removedIds.length > 0) canvas.removeEdges(removedIds)
  }

  // Mount guard + timer cleanup: a push settling after the map closed must
  // not set state on the unmounted component or park a timer holding the
  // render closure alive.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (toastTimer.current !== undefined) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (message: string): void => {
    if (!mountedRef.current) return
    setToast(message)
    if (toastTimer.current !== undefined) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => { setToast(null) }, 4000)
  }

  /** Pick edge anchor sides from the cards' relative placement. */
  const sideHandles = (from: Card, to: Card): { fromHandle: string; toHandle: string } => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? { fromHandle: 'r', toHandle: 'l' } : { fromHandle: 'l', toHandle: 'r' }
    }
    return dy >= 0 ? { fromHandle: 'b', toHandle: 't' } : { fromHandle: 't', toHandle: 'b' }
  }

  /** A plain association between two existing cards. One edge per pair —
   * a second draw over an already-connected pair is silently a no-op. */
  const createLinkEdge = (
    fromCardId: string,
    toCardId: string,
    handles?: { fromHandle?: string | null; toHandle?: string | null },
  ): void => {
    if (fromCardId === toCardId) return
    const exists = Object.values(canvasState.edges).some(edge =>
      (edge.fromCardId === fromCardId && edge.toCardId === toCardId)
      || (edge.fromCardId === toCardId && edge.toCardId === fromCardId))
    if (exists) return
    const fromCard = canvasState.cards[fromCardId]
    const toCard = canvasState.cards[toCardId]
    if (fromCard === undefined || toCard === undefined) return
    const geometry = sideHandles(fromCard, toCard)
    const fromTitle = sessions.byId[fromCard.sessionId]?.displayTitle
    canvas.addEdges({
      [`edge-${crypto.randomUUID()}`]: {
        boardId: INBOX_BOARD_ID,
        fromCardId,
        toCardId,
        injection: { kind: 'link' },
        fromHandle: handles?.fromHandle ?? geometry.fromHandle,
        toHandle: handles?.toHandle ?? geometry.toHandle,
        ...(fromTitle !== undefined ? { fromTitle } : {}),
        createdAt: Date.now(),
      },
    })
  }

  /** Handle-to-handle drop on another card (ConnectionMode.Loose). */
  const onConnect = (connection: Connection): void => {
    // An Esc-cancelled gesture must not create an edge even when released
    // on a handle (React Flow calls onConnect BEFORE onConnectEnd; the
    // flag is reset there).
    if (connectCancelledRef.current) return
    createLinkEdge(connection.source, connection.target, {
      fromHandle: connection.sourceHandle,
      toHandle: connection.targetHandle,
    })
  }

  /** The pipe: push the source's latest digest into the target's inbox. */
  const pushAlongEdge = async (fromCardId: string, toCardId: string): Promise<void> => {
    const fromCard = canvasState.cards[fromCardId]
    const toCard = canvasState.cards[toCardId]
    if (fromCard === undefined || toCard === undefined) return
    const digest = canvasState.digests[fromCard.sessionId]
    if (digest === undefined || digestIsEmpty(digest)) return
    const fromTitle = sessions.byId[fromCard.sessionId]?.displayTitle ?? fromCard.sessionId
    const toTitle = sessions.byId[toCard.sessionId]?.displayTitle ?? toCard.sessionId
    try {
      await talkMapApi.injectContext(toCard.sessionId, [
        { sessionId: fromCard.sessionId, text: buildPushText(fromTitle, digest) },
      ])
      showToast(t('toast.pushed', { to: toTitle }))
    } catch (error) {
      const code = (error as ApiError).code
      showToast(code === 'session-not-live'
        ? t('toast.notLive')
        : `${t('toast.pushFailed')}${String(error)}`)
    }
  }

  const onConnectEnd = (
    event: MouseEvent | TouchEvent,
    connectionState: FinalConnectionState,
  ): void => {
    setConnecting(false)
    if (connectCancelledRef.current) {
      connectCancelledRef.current = false
      return
    }
    if (connectionState.isValid === true) return // landed on a handle → onConnect
    const fromNodeId = connectionState.fromNode?.id
    if (fromNodeId === undefined) return
    const card = canvasState.cards[fromNodeId]
    if (card === undefined) return
    const client = 'clientX' in event
      ? { x: event.clientX, y: event.clientY }
      : event.changedTouches[0] !== undefined
        ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
        : undefined
    if (client === undefined) return
    const position = screenToFlowPosition(client)
    // Dropped on an existing card's BODY (between handles)? That's a link,
    // not a fork — only a drop on empty canvas opens the spawn panel.
    // DOM hit-testing, not card-rect math: cards are min-height and grow
    // with their digest, so a fixed-height rectangle misjudges both the
    // lower band of tall cards and the space under short ones — and the
    // DOM answers with proper stacking order for overlapping cards.
    // elementsFromPoint (plural): overlay UI (the Controls panel, the
    // color toolbar) floats above the canvas and would shadow a card
    // beneath it — walk the whole stack for the topmost card node.
    const hitNode = document.elementsFromPoint(client.x, client.y)
      .map(el => el.closest('.react-flow__node[data-id^="card-"]'))
      .find(el => el !== null)
    const hitId = hitNode?.getAttribute('data-id') ?? undefined
    if (hitId !== undefined && visibleCards[hitId] !== undefined) {
      if (hitId !== fromNodeId) createLinkEdge(fromNodeId, hitId)
      return
    }
    const summary = sessions.byId[card.sessionId]
    if (summary === undefined) return
    const parentWorkspaceId = sessionWs.get(card.sessionId)
    setPendingSpawn({
      parent: { cardId: fromNodeId, sessionId: card.sessionId, title: summary.displayTitle },
      ...(parentWorkspaceId !== undefined ? { parentWorkspaceId } : {}),
      x: snap(position.x - CARD_W / 2),
      y: snap(position.y - CARD_H / 2),
    })
  }

  const openSession = (sessionId: string): void => {
    // Open first: if the runtime has no session opener, the map stays up (and
    // the reason lands in the console) instead of closing onto the old chat.
    if (openSessionInUi(sessionId)) closeMapPanel()
  }

  /**
   * Which folder is under a flow-space point (rendered rects, not the stored
   * ones). Two folders can overlap on a free board, so the SMALLEST one wins:
   * the more specific target is the one the pointer is really on.
   */
  const groupAtPoint = (x: number, y: number): string | undefined => {
    let best: { groupId: string; area: number } | undefined
    for (const [groupId, rect] of Object.entries(frameRects)) {
      if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) continue
      const area = rect.width * rect.height
      if (best === undefined || area < best.area) best = { groupId, area }
    }
    return best?.groupId
  }

  /**
   * Open the in-place composer. Inside a folder the new conversation belongs to
   * that workspace and is created with that workspace preselected; on empty
   * canvas the composer falls back to its own workspace picker.
   */
  const openDraftAt = (flowX: number, flowY: number, forcedGroupId?: string): void => {
    const x = snap(flowX - CARD_W / 2)
    const y = snap(flowY - 40)
    const groupId = forcedGroupId ?? groupAtPoint(flowX, flowY)
    const isWorkspace = groupId !== undefined && (wsTitles.has(groupId) || frameRects[groupId] !== undefined)
    setDraft({
      x,
      y,
      ...(isWorkspace ? { workspaceId: groupId } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
    })
  }

  // ---- import actions -------------------------------------------------

  const boardSessionIds = useMemo(
    () => new Set(Object.values(canvasState.cards).map(card => card.sessionId)),
    [canvasState.cards],
  )

  const importWorkspace = (workspaceId: string, atX: number, atY: number): void => {
    const memberSessions = placeableSessionIds(sessions)
      .filter(id => sessionWs.get(id) === workspaceId && !boardSessionIds.has(id))
      .sort((a, b) => (sessions.byId[b]?.updatedAt ?? 0) - (sessions.byId[a]?.updatedAt ?? 0))
    const memory = canvasState.global?.layoutMemory ?? {}
    const remembered = memberSessions.filter(id => memory[id] !== undefined)
    const fresh = memberSessions.filter(id => memory[id] === undefined)
    const added: Record<string, Card> = {}
    const placed: Card[] = []
    // Sessions seen before return to their remembered spot (and color).
    for (const sessionId of remembered) {
      const entry = memory[sessionId]
      if (entry === undefined) continue
      const card: Card = {
        boardId: INBOX_BOARD_ID,
        sessionId,
        x: entry.x,
        y: entry.y,
        ...(entry.colorTag !== undefined ? { colorTag: entry.colorTag } : {}),
        createdAt: Date.now(),
      }
      added[newCardId()] = card
      placed.push(card)
    }
    // New sessions grid below the restored arrangement, or at the click point.
    const origin = placed.length > 0
      ? { x: snap(Math.min(...placed.map(card => card.x))), y: snap(Math.max(...placed.map(card => card.y)) + CARD_H + GAP_Y) }
      : { x: snap(atX), y: snap(atY) }
    fresh.forEach((sessionId, index) => {
      const position = gridPosition(origin, index)
      const card: Card = {
        boardId: INBOX_BOARD_ID,
        sessionId,
        x: position.x,
        y: position.y,
        createdAt: Date.now(),
      }
      added[newCardId()] = card
      placed.push(card)
    })
    if (placed.length > 0) canvas.addCards(added)
    const rect = placed.length > 0
      ? fitRect(placed)
      : { x: snap(atX) - FRAME_PAD, y: snap(atY) - FRAME_PAD - FRAME_LABEL_H, width: 400, height: 260 }
    canvas.setWsFrameRect(workspaceId, rect)
  }

  const importSession = (sessionId: string, atX: number, atY: number): void => {
    canvas.addCards({
      [newCardId()]: {
        boardId: INBOX_BOARD_ID,
        sessionId,
        x: snap(atX),
        y: snap(atY),
        createdAt: Date.now(),
      },
    })
  }

  const syncGroup = (groupId: string): void => {
    const rect = frameRects[groupId] ?? wsFrames[groupId]
    if (rect === undefined) return
    const fresh = placeableSessionIds(sessions)
      .filter(id => sessionWs.get(id) === groupId && !boardSessionIds.has(id))
    if (fresh.length === 0) return
    const members = (membersByGroup.get(groupId) ?? [])
      .map(id => canvasState.cards[id])
      .filter((card): card is Card => card !== undefined)
    const origin = members.length > 0
      ? { x: Math.min(...members.map(card => card.x)), y: Math.max(...members.map(card => card.y)) + CARD_H + GAP_Y }
      : { x: rect.x + FRAME_PAD, y: rect.y + FRAME_LABEL_H + FRAME_PAD }
    const memory = canvasState.global?.layoutMemory ?? {}
    const added: Record<string, Card> = {}
    let gridIndex = 0
    for (const sessionId of fresh) {
      const entry = memory[sessionId]
      const position = entry !== undefined ? { x: entry.x, y: entry.y } : gridPosition(origin, gridIndex++)
      added[newCardId()] = {
        boardId: INBOX_BOARD_ID,
        sessionId,
        x: position.x,
        y: position.y,
        ...(entry?.colorTag !== undefined ? { colorTag: entry.colorTag } : {}),
        createdAt: Date.now(),
      }
    }
    canvas.addCards(added)
  }

  const removeGroup = (groupId: string): void => {
    for (const cardId of membersByGroup.get(groupId) ?? []) canvas.removeCard(cardId)
    const framesNext = { ...wsFrames }
    delete framesNext[groupId]
    // wsColors is deliberately kept: a re-import brings the color back.
    canvas.patchGlobalNow({ wsFrames: framesNext })
  }

  // ---- context menu ----------------------------------------------------

  const openMenu = (
    event: React.MouseEvent | MouseEvent,
    kind: MenuContext['kind'],
    targetId?: string,
    edgeEnds?: { from: string; to: string },
  ): void => {
    event.preventDefault()
    const wrapper = wrapperRef.current
    if (wrapper === null) return
    const bounds = wrapper.getBoundingClientRect()
    const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    setMenu({
      left: event.clientX - bounds.left,
      top: event.clientY - bounds.top,
      flowX: flow.x,
      flowY: flow.y,
      kind,
      ...(targetId !== undefined ? { targetId } : {}),
      ...(edgeEnds !== undefined ? { edgeFrom: edgeEnds.from, edgeTo: edgeEnds.to } : {}),
      view: 'root',
    })
  }

  const menuState: MenuState | null = useMemo(() => {
    if (menu === null) return null
    const close = (): void => { setMenu(null) }
    const items: MenuItem[] = []
    let title: string | undefined

    if (menu.view === 'new-ws') {
      const parentDir = ((): string => {
        const sample = workspaces.items[0]?.path
        if (sample === undefined) return ''
        const cut = sample.lastIndexOf('/')
        return cut > 0 ? sample.slice(0, cut) : sample
      })()
      return {
        left: menu.left,
        top: menu.top,
        title: t('menu.newWs'),
        prompt: {
          placeholder: t('draft.wsNamePlaceholder'),
          submitLabel: t('menu.createAndImport'),
          preview: (value: string) => `${parentDir}/${value}`,
          onSubmit: async (value: string) => {
            const services = getServices()
            if (services === undefined || parentDir === '') throw new Error('no workspace root available')
            const api = connectionApi()
            if (api === undefined) throw new Error(t('spawn.apiUnavailable'))
            const path = `${parentDir}/${value}`
            await talkMapApi.ensureDir(path)
            const response = await api.workspace.create({ path })
            if (!response.result.ok) {
              throw new Error(`workspace.create: ${response.result.error.message ?? response.result.error.code ?? ''}`)
            }
            importWorkspace(response.result.value.workspace.workspaceId, menu.flowX, menu.flowY)
            close()
          },
        },
        items: [],
      }
    }

    if (menu.view === 'import-ws') {
      title = t('menu.importWs')
      items.push({
        key: '__new__',
        label: t('menu.newWs'),
        onPick: () => { setMenu({ ...menu, view: 'new-ws' }) },
      })
      for (const item of workspaces.items) {
        const imported = wsFrames[item.workspaceId] !== undefined
        items.push({
          key: item.workspaceId,
          label: item.title,
          ...(imported ? { hint: t('menu.alreadyImported') } : {}),
          onPick: () => {
            if (imported) syncGroup(item.workspaceId)
            else importWorkspace(item.workspaceId, menu.flowX, menu.flowY)
            close()
          },
        })
      }
    } else if (menu.view === 'import-session') {
      title = t('menu.importSession')
      const candidates = placeableSessionIds(sessions)
        .filter(id => !boardSessionIds.has(id))
        .slice(0, 200)
      for (const sessionId of candidates) {
        items.push({
          key: sessionId,
          label: sessions.byId[sessionId]?.displayTitle ?? sessionId,
          onPick: () => {
            importSession(sessionId, menu.flowX, menu.flowY)
            close()
          },
        })
      }
    } else if (menu.kind === 'pane') {
      items.push({
        key: 'draft',
        label: t('menu.newChat'),
        onPick: () => {
          openDraftAt(menu.flowX, menu.flowY)
          close()
        },
      })
      items.push({
        key: 'import-ws',
        label: `${t('menu.importWs')}…`,
        onPick: () => { setMenu({ ...menu, view: 'import-ws' }) },
      })
      items.push({
        key: 'import-session',
        label: `${t('menu.importSession')}…`,
        onPick: () => { setMenu({ ...menu, view: 'import-session' }) },
      })
    } else if (menu.kind === 'card' && menu.targetId !== undefined) {
      const cardId = menu.targetId
      const card = canvasState.cards[cardId]
      items.push({
        key: 'open',
        label: t('menu.open'),
        onPick: () => {
          close()
          if (card !== undefined) openSession(card.sessionId)
        },
      })
      items.push({
        key: 'digest',
        label: t('card.refresh'),
        onPick: () => {
          close()
          if (card !== undefined) void talkMapApi.refreshDigest(card.sessionId).catch(() => undefined)
        },
      })
      items.push({
        key: 'remove',
        label: t('menu.removeCard'),
        onPick: () => {
          canvas.removeCard(cardId)
          close()
        },
      })
    } else if (menu.kind === 'edge' && menu.targetId !== undefined
      && menu.edgeFrom !== undefined && menu.edgeTo !== undefined) {
      const edgeId = menu.targetId
      const edgeFrom = menu.edgeFrom
      const edgeTo = menu.edgeTo
      const stored = canvasState.edges[edgeId]
      const fromCard = canvasState.cards[edgeFrom]
      const toCard = canvasState.cards[edgeTo]
      const fromTitle = fromCard !== undefined
        ? sessions.byId[fromCard.sessionId]?.displayTitle ?? fromCard.sessionId
        : '?'
      const toTitle = toCard !== undefined
        ? sessions.byId[toCard.sessionId]?.displayTitle ?? toCard.sessionId
        : '?'
      title = `${fromTitle} → ${toTitle}`
      const digest = fromCard !== undefined ? canvasState.digests[fromCard.sessionId] : undefined
      const noDigest = digest === undefined || digestIsEmpty(digest)
      items.push({
        key: 'push',
        label: t('edge.push'),
        ...(noDigest ? { hint: t('edge.pushNoDigest'), disabled: true } : {}),
        onPick: () => {
          close()
          void pushAlongEdge(edgeFrom, edgeTo)
        },
      })
      // Stored edges only — lineage lines are derived, nothing to persist on.
      // (Auto-sync is shelved: schema + host fan-out exist but stay
      // unwired until the feature is wanted — see the handover doc.)
      if (stored !== undefined) {
        items.push({
          key: 'delete-edge',
          label: t('edge.delete'),
          onPick: () => {
            canvas.removeEdges([edgeId])
            close()
          },
        })
      }
    } else if (menu.kind === 'frame' && menu.targetId !== undefined) {
      const groupId = menu.targetId
      items.push({
        key: 'sync',
        label: t('menu.syncGroup'),
        onPick: () => {
          syncGroup(groupId)
          close()
        },
      })
      items.push({
        key: 'remove-group',
        label: t('menu.removeGroup'),
        onPick: () => {
          removeGroup(groupId)
          close()
        },
      })
    }
    const searchable = menu.view === 'import-ws' || menu.view === 'import-session'
    return {
      left: menu.left,
      top: menu.top,
      ...(title !== undefined ? { title } : {}),
      ...(searchable ? { searchable } : {}),
      items,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, workspaces.items, sessions, boardSessionIds, wsFrames, wsTitles, canvasState.cards, canvasState.edges, canvasState.digests, locale])

  const savedCamera = canvas.savedCamera(INBOX_BOARD_ID)
  const hasContent = Object.keys(visibleCards).length > 0 || Object.keys(wsFrames).length > 0

  return (
    <div
      ref={wrapperRef}
      className={`${styles['canvas']}${connecting ? ` ${styles['canvasConnecting']}` : ''}`}
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement
        // React Flow renders nodes INSIDE the pane, so the pane check below is
        // true for a card as well. A card owns its own double-click (open the
        // conversation) — never drop a draft card on top of one.
        const nodeElement = target.closest('.react-flow__node')
        if (nodeElement !== null) {
          const nodeId = nodeElement.getAttribute('data-id') ?? ''
          // A double-click anywhere on a FOLDER (its label, its border, or the
          // transparent body that lets the event through to the pane) starts a
          // conversation in that workspace, at the point you clicked.
          if (nodeId.startsWith('frame-')) {
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
            openDraftAt(position.x, position.y, nodeId.slice('frame-'.length))
          }
          return
        }
        if (target.closest('.react-flow__pane') === null) return
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
        openDraftAt(position.x, position.y)
      }}
      onContextMenu={(event) => { event.preventDefault() }}
      onClick={() => { if (menu !== null) setMenu(null) }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={() => {
          // A fresh drag always starts clean — a cancel flag left over from
          // a path that never reached onConnectEnd must not eat this one.
          connectCancelledRef.current = false
          setConnecting(true)
        }}
        onConnectEnd={onConnectEnd}
        connectionMode={ConnectionMode.Loose}
        onSelectionStart={onSelectionStart}
        onSelectionEnd={onSelectionEnd}
        onNodeClick={(event, node) => {
          if (node.type !== 'wsFrame') return
          // Click-only frame selection (React Flow never selects frames).
          const frameId = node.id
          setSelectedIds((previous) => {
            if (event.shiftKey) {
              const next = new Set(previous)
              if (next.has(frameId)) next.delete(frameId)
              else next.add(frameId)
              return next
            }
            return new Set([frameId])
          })
        }}
        onNodeDoubleClick={(_event, node) => {
          if (node.type === 'sessionCard' && !(node as SessionCardNodeType).data.ghost) {
            openSession((node as SessionCardNodeType).data.sessionId)
          }
        }}
        onPaneContextMenu={(event) => { openMenu(event as MouseEvent, 'pane') }}
        onNodeContextMenu={(event, node) => {
          if (node.type === 'sessionCard') openMenu(event, 'card', node.id)
          else if (node.type === 'wsFrame') openMenu(event, 'frame', node.id.slice('frame-'.length))
          else event.preventDefault()
        }}
        onEdgeContextMenu={(event, edge) => {
          const data = edge.data as { fromCardId?: string; toCardId?: string } | undefined
          if (data?.fromCardId !== undefined && data.toCardId !== undefined) {
            openMenu(event, 'edge', edge.id, { from: data.fromCardId, to: data.toCardId })
          } else {
            event.preventDefault()
          }
        }}
        onMoveEnd={(_event, viewport: Viewport) => {
          canvas.setCamera(INBOX_BOARD_ID, viewport)
        }}
        colorMode={dark ? 'dark' : 'light'}
        snapToGrid
        snapGrid={[GRID, GRID]}
        zoomOnDoubleClick={false}
        panOnDrag={panMode ? true : [1, 2]}
        selectionOnDrag={!panMode}
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={['Backspace', 'Delete']}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
        {...(savedCamera !== undefined ? { defaultViewport: savedCamera } : { fitView: hasContent })}
      >
        <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} />
        <Controls showInteractive={false}>
          <ControlButton title={t('map.zoom100')} onClick={() => { void zoomTo(1, { duration: 200 }) }}>
            <span className={styles['zoomResetLabel']}>1:1</span>
          </ControlButton>
          <ControlButton
            title={panMode ? '拖拽平移中（点一下切成框选）' : '框选模式（点一下切成拖拽平移）'}
            aria-pressed={panMode}
            onClick={() => { setPanMode((v) => !v) }}
          >
            {panMode ? (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
              </svg>
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
                <rect x={3} y={3} width={18} height={18} rx={2} strokeDasharray="3 3" />
              </svg>
            )}
          </ControlButton>
        </Controls>
      </ReactFlow>
      {liveSelectedIds.size > 0
        ? (
            <ColorToolbar
              selectedIds={liveSelectedIds}
              visibleCards={visibleCards}
            />
          )
        : null}
      {hasContent || draft !== null ? null : <div className={styles['emptyHint']}>{t('map.empty')}</div>}
      {menuState !== null
        ? <ContextMenu key={menu?.view ?? 'root'} menu={menuState} onClose={() => { setMenu(null) }} />
        : null}
      {pendingSpawn !== null
        ? <SpawnPreview pending={pendingSpawn} onClose={() => { setPendingSpawn(null) }} />
        : null}
      {toast !== null ? <div className={styles['toast']}>{toast}</div> : null}
    </div>
  )
}

function ColorToolbar(props: {
  selectedIds: ReadonlySet<string>
  visibleCards: Readonly<Record<string, Card>>
}): React.JSX.Element {
  const selectedCardIds = [...props.selectedIds].filter(id => props.visibleCards[id] !== undefined)
  const selectedFrameWs = [...props.selectedIds]
    .filter(id => id.startsWith('frame-'))
    .map(id => id.slice('frame-'.length))
  const applyColor = (colorTag: string | undefined): void => {
    if (selectedCardIds.length > 0) canvas.setCardsColor(selectedCardIds, colorTag)
    for (const workspaceId of selectedFrameWs) canvas.setWorkspaceColor(workspaceId, colorTag)
  }
  return (
    <div className={styles['colorToolbar']} role="toolbar" aria-label={t('color.toolbar')}>
      <span className={styles['colorToolbarLabel']}>{t('color.toolbar')}</span>
      {COLOR_TAGS.map(tag => (
        <button
          key={tag.id}
          type="button"
          className={styles['colorSwatch']}
          style={{ background: tag.swatch }}
          title={tag.id}
          aria-label={tag.id}
          onClick={() => { applyColor(tag.id) }}
        />
      ))}
      <button
        type="button"
        className={`${styles['colorSwatch']} ${styles['colorSwatchClear']}`}
        title={t('color.clear')}
        aria-label={t('color.clear')}
        onClick={() => { applyColor(undefined) }}
      >
        ×
      </button>
    </div>
  )
}

export function MapCanvas(props: RootSlotStandardProps): React.JSX.Element {
  const canvasState = useSyncExternalStore(canvas.subscribe, canvas.get)

  useEffect(() => {
    canvas.ensureLoaded()
    canvas.refresh()
    return canvas.connect()
  }, [])

  if (canvasState.phase === 'error') {
    return (
      <div className={styles['canvas']}>
        <div className={styles['emptyHint']}>
          {t('map.loadError')} {canvasState.error}
          <button
            type="button"
            className={styles['cardRemove']}
            style={{ marginLeft: 8 }}
            onClick={() => { canvas.reload() }}
          >
            {t('map.retry')}
          </button>
        </div>
      </div>
    )
  }
  if (canvasState.phase !== 'ready') {
    return (
      <div className={styles['canvas']}>
        <div className={styles['emptyHint']}>{t('map.loading')}</div>
      </div>
    )
  }
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export type { CanvasState }
