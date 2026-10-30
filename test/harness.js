/**
 * Offline harness for the talk-map client bundle.
 *
 * Loads the real built artifact (client/client.js) in a real browser with a
 * fake Cordis context and fake DSH services, so UI/layout changes can be
 * verified and screenshotted WITHOUT restarting the app. Nothing here ships:
 * `test/` is not in package.json's files list and the bundle never imports it.
 *
 * window.__harness surface (used by the Playwright probe):
 *   boot()            capture the loader module, apply() it, mount the overlay
 *   open() / close()  drive the map's own toggle
 *   state()           the mock map payload the client currently sees
 *   posts             every POST body the client sent (layout assertions)
 *   nodeBoxes()       DOM rects of cards / frames, in screen coordinates
 */
(function () {
  const React = window.React
  const ReactDOM = window.ReactDOM

  // ---- jsx-runtime shim ------------------------------------------------
  // The shell hands the plugin real react/jsx-runtime; UMD builds do not ship
  // it, so the harness provides the same three functions.
  const jsx = (type, config, key) => {
    const props = Object.assign({}, config || {})
    if (key !== undefined) props.key = key
    return React.createElement(type, props)
  }
  const jsxRuntime = { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: React.Fragment }

  const registry = {}
  window.__ModuleLoader__ = { load(entry) { registry[entry.id] = entry } }

  // ---- mock map state --------------------------------------------------
  const T0 = Date.now()
  const MIN = 60_000

  function session(id, title, extra) {
    return Object.assign({
      displayTitle: title,
      blank: false,
      origin: 'user',
      updatedAt: T0 - 5 * MIN,
      running: false,
      retainedBy: { mainView: 0 },
    }, extra || {})
  }

  const sessionRows = {}
  const workspaceList = [
    { workspaceId: 'ws-daily', title: '日常任务', path: 'D:/Projects/daily', sessionIds: ['s1', 's2', 's3', 's4', 's5'] },
    { workspaceId: 'ws-medkit', title: 'Open MedKit', path: 'D:/Projects/medkit', sessionIds: ['s6', 's7', 's8'] },
    { workspaceId: 'ws-lab', title: '实验场', path: 'D:/Projects/lab', sessionIds: ['s9'] },
    // Imported folder whose session has no card yet: the auto-sync on open must add it.
    { workspaceId: 'ws-sync', title: '自动同步', path: 'D:/Projects/sync', sessionIds: ['s10'] },
  ]
  const titles = {
    s1: '对话地图插件改版', s2: '桌面自动化脚本清理', s3: 'DSH 会话日志解析',
    s4: 'Matter.js 物理参数换算', s5: '云盘同步目录整理',
    s6: '医学影像标注流程', s7: '标注工具离线化', s8: '数据集切分脚本',
    s9: '代理端口探测', s10: '自动同步进来的会话',
  }
  // Distinct recency stamps: the folder must lay these out newest-first, so the
  // probe can assert the slot order against this table.
  let spawnCount = 0
  const minutesAgo = { s1: 2, s2: 15, s3: 90, s4: 240, s5: 40, s6: 5, s7: 60, s8: 30, s9: 8, s10: 300 }
  for (const ws of workspaceList) {
    for (const id of ws.sessionIds) {
      sessionRows[id] = session(id, titles[id], { updatedAt: T0 - minutesAgo[id] * MIN })
    }
  }
  sessionRows.s1.running = true
  sessionRows.s3.completed = true
  sessionRows.s8.blank = true // a blank session must not render a card

  // `let` so touch()/pin()/archive() can hand the tree a NEW object — the
  // client's memos compare identity, so mutating in place would look like
  // "nothing changed".
  let sessionsState = { ids: Object.keys(sessionRows), byId: sessionRows }
  let pinnedSessionIds = []
  let archivedSessionIds = []
  const buildWorkspaces = () => ({
    items: workspaceList,
    baselinesReady: true,
    pinnedSessionIds,
    archivedSessionIds,
  })
  let workspacesState = buildWorkspaces()
  // ui-session's projection: s1 still running (white lamp), s3 finished while
  // unwatched (green lamp), s2 blocked on the user (amber lamp).
  let churnTimer
  /** Artificial latency for the card-body route (proves the local cache path). */
  let previewDelayMs = Number(new URLSearchParams(location.search).get('slowPreviews') ?? 0) || 0
  let statusById = new Map([
    ['s1', { running: true }],
    ['s3', { completionUnread: true }],
    ['s2', { pendingInteraction: { kind: 'approval' } }],
  ])

  const PAD = 32
  const LABEL = 30
  const CARD_W = 224
  const CARD_H = 120
  const GAP_X = 48
  const GAP_Y = 56
  const FRAME_SHAPE = {
    'ws-daily': { cols: 3, rows: 1 },
    'ws-medkit': { cols: 2, rows: 1 },
    'ws-lab': { cols: 1, rows: 1 },
    'ws-sync': { cols: 1, rows: 1 },
  }

  function frame(id) {
    // Fixed shapes on purpose: the daily folder is deliberately ONE row tall, so
    // five conversations cannot fit and the overflow stack has to appear.
    const shape = FRAME_SHAPE[id]
    return {
      x: id === 'ws-medkit' ? 960 : 0,
      y: id === 'ws-lab' ? 640 : id === 'ws-sync' ? 1000 : 0,
      width: shape.cols * (CARD_W + GAP_X) - GAP_X + PAD * 2,
      height: shape.rows * (CARD_H + GAP_Y) - GAP_Y + PAD * 2 + LABEL,
    }
  }

  const frames = {
    'ws-daily': frame('ws-daily'),
    'ws-medkit': frame('ws-medkit'),
    'ws-lab': frame('ws-lab'),
    'ws-sync': frame('ws-sync'),
  }

  const cards = {}
  let counter = 0
  for (const ws of workspaceList) {
    // ws-sync is the auto-sync fixture: its frame is on the map with NO card, so
    // opening the map has to pull the session in by itself.
    if (ws.workspaceId === 'ws-sync') continue
    const rect = frames[ws.workspaceId]
    const cols = Math.max(1, Math.floor((rect.width - PAD * 2 + GAP_X) / (CARD_W + GAP_X)))
    ws.sessionIds.forEach((sessionId, index) => {
      if (sessionRows[sessionId].blank) return
      const col = index % cols
      const row = Math.floor(index / cols)
      cards[`card-${++counter}`] = {
        boardId: 'inbox',
        sessionId,
        x: rect.x + PAD + col * (CARD_W + GAP_X),
        y: rect.y + PAD + LABEL + row * (CARD_H + GAP_Y),
        createdAt: T0,
      }
    })
  }

  // One association edge on the board, so the edge context menu always has
  // something to open (the per-edge auto-push switch lives there).
  const edges = {}
  if (Object.keys(cards).length >= 2) {
    edges['edge-fixture'] = {
      boardId: 'inbox',
      fromCardId: 'card-1',
      toCardId: 'card-2',
      injection: { kind: 'link' },
      createdAt: T0,
    }
  }

  const digests = {
    s1: { atSeq: 12, summary: '把卡片改成网格槽位，含退让与补位动画。', keyFindings: [], nextStep: '补完工作区伸缩与双击新建', generatedAt: T0 },
    s2: { atSeq: 8, summary: '清理临时截图与旧脚本，统一放回收区。', keyFindings: [], nextStep: '核对 skill 内嵌脚本', generatedAt: T0 - 20 * MIN },
    s6: { atSeq: 5, summary: '标注流程拆成标注、复核两段。', keyFindings: [], nextStep: '补离线包说明', generatedAt: T0 - 200 * MIN },
    s7: { atSeq: 9, summary: '标注工具离线化，导出 JSON 走本地校验。', keyFindings: ['离线包不带网络请求', '导出前先跑一遍校验'], nextStep: '补一份示例标注', generatedAt: T0 - 260 * MIN },
  }

  /**
   * Last thing the user said per session — the card body since the summary went.
   * The HOST filters by source.kind, so the route only ever returns human text;
   * the client's job is just to render it (no pattern matching any more).
   */
  const userMessages = {
    s1: '把卡片改成网格槽位，含退让与补位动画',
    s2: '清理一下临时截图和旧脚本',
  }
  const globalState = {
    version: 1,
    activeBoard: 'inbox',
    cameraByBoard: {},
    layoutVersion: 3,
    wsFrames: frames,
    wsColors: { 'ws-medkit': 'blue' },
    locale: 'zh',
  }

  const payload = {
    boards: { inbox: { name: '收件箱', color: '#888', order: 0, createdAt: T0 } },
    cards,
    edges,
    digests,
    global: globalState,
  }

  // ---- fetch / EventSource mocks ------------------------------------
  /** '/talk-map/search' hits, and a switch to make the RPC path fail. */
  const searchRouteCalls = []
  const searchContextCalls = []
  const digestCalls = []
  const searchRouteScopes = []
  const searchSessionCalls = []
  let searchRpcFails = false
  let searchDelayMs = 0
  let searchRouteFails = false
  let searchRouteMessage = 'host search route down'
  const posts = []
  /** Every POST the map makes to dsh-recycle-bin's route. */
  const recycleCalls = []
  /** Simulate the host refusing a move because the session still has work. */
  let recycleBusyFlag = false
  let recycleBusyLeft = 0
  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { 'content-type': 'application/json' },
    }))
  }
  window.fetch = function (url, init) {
    const path = String(url)
    if (path.indexOf('dsh-session-recycle-bin/api') >= 0) {
      let body = null
      try { body = JSON.parse(init?.body ?? 'null') } catch { body = null }
      recycleCalls.push(body)
      // Refuse the first move while the flag is on — the host's `session-open`
      // answer for a session that still has work.
      if (recycleBusyFlag && recycleBusyLeft > 0) {
        recycleBusyLeft -= 1
        return json({
          ok: false,
          code: 'session-open',
          message: 'the session still has work in this Harness process: the Agent is running or has queued input',
        }, 409)
      }
      const count = Array.isArray(body?.sessionIds) ? body.sessionIds.length : 1
      return json({ ok: true, trashedCount: count, archivedCount: count, failedCount: 0 })
    }
    if (init && init.method === 'POST') {
      let body = null
      try { body = JSON.parse(init.body) } catch { body = init.body }
      posts.push({ path, body })
      // Behave like the real host: persist card writes into the served state, so
      // a later /talk-map/state read reflects them (the client refreshes on open).
      if (path.includes('/talk-map/cards/upsert') && body !== null) {
        Object.assign(payload.cards, body.cards ?? {})
      }
      if (path.includes('/talk-map/cards/delete') && body !== null) {
        for (const id of body.ids ?? []) delete payload.cards[id]
      }
      if (path.includes('/talk-map/global') && body !== null && body.global !== undefined) {
        payload.global = body.global
      }
      // Host-side fallback for the drawer's full-text search (the client calls
    // this when the shared RPC surface does not answer).
    // Extra hits inside one conversation (asked for with the ＋ button).
    if (path.indexOf('/talk-map/search-session') >= 0) {
      searchSessionCalls.push({ sessionId: body?.sessionId, query: body?.query })
      return json({
        blocks: [['用 **物理参数** 换算，见 `PX_PER_M`'], ['第二条：*物理量* 走 PX_PER_M']],
        seqs: [42, 43],
      })
    }
    // On-demand digest: the push path refreshes before injecting (hash-aware).
    if (path.indexOf('/talk-map/digest/ensure') >= 0 || path.indexOf('/talk-map/digest/refresh') >= 0) {
      digestCalls.push({ sessionId: String(body?.sessionId ?? ''), kind: path.includes('ensure') ? 'ensure' : 'refresh' })
      return json({ sessionId: String(body?.sessionId ?? ''), digest: digests[String(body?.sessionId ?? '')] ?? null })
    }
    // Lazy passage for one hit (hover).
    if (path.indexOf('/talk-map/search-context') >= 0) {
      searchContextCalls.push({ sessionId: body?.sessionId, seq: body?.seq })
      return json({ lines: ['上文第一行', '上文第二行', '…按 SI 单位换算 Matter.js 的物理参数…', '下文第一行', '下文第二行'] })
    }
    if (path.indexOf('/talk-map/search') >= 0) {
      if (searchRouteFails) return Promise.resolve(new Response(JSON.stringify({ error: searchRouteMessage }), { status: 500, headers: { 'content-type': 'application/json' } }))
      searchRouteCalls.push(String(body?.query ?? ''))
      searchRouteScopes.push(String(body?.cwd ?? ''))
      const query = String(body?.query ?? '')
      // Grouped shape: one conversation, two matched lines.
      // Two conversations: one spawned by an agent, one yours.
      const items = query.includes('物理') || query.includes('Matter')
        ? [
          { sessionId: 's3', blocks: [['用 **物理参数** 换算，见 \u0060PX_PER_M\u0060 与 [文档](https://x)']], seqs: [42], roles: ['user'] },
          { sessionId: 's1', blocks: [['…物理引擎参数换算…']], seqs: [7], roles: ['agent'] },
        ]
        : []
      if (searchDelayMs > 0) {
        return new Promise((resolve) => {
          setTimeout(() => { resolve(new Response(JSON.stringify({ items, hasMore: false }), { status: 200, headers: { 'content-type': 'application/json' } })) }, searchDelayMs)
        })
      }
      return json({ items, hasMore: false })
    }
    // The card body is the user's last message now, not an LLM digest.
      if (path.indexOf('/talk-map/last-user') >= 0) {
        const texts = {}
        for (const sessionId of body?.sessionIds ?? []) {
          texts[sessionId] = userMessages[sessionId] ?? '你最后说的那句话'
        }
        if (previewDelayMs <= 0) return json({ texts })
        return new Promise((resolve) => {
          setTimeout(() => { resolve(new Response(JSON.stringify({ texts }), { status: 200, headers: { 'content-type': 'application/json' } })) }, previewDelayMs)
        })
      }
      return json({ ok: true })
    }
    if (path.indexOf('/talk-map/state') >= 0) return json(payload)
    if (path.indexOf('/talk-map/defaults') >= 0) {
      return json({ model: { provider: 'deepseek', model: 'deepseek-v4-pro' }, preset: 'standard' })
    }
    // Host-side fallback for the drawer's full-text search (the client calls
    // this when the shared RPC surface does not answer).
    // On-demand digest: the push path refreshes before injecting (hash-aware).
    if (path.indexOf('/talk-map/digest/ensure') >= 0 || path.indexOf('/talk-map/digest/refresh') >= 0) {
      digestCalls.push({ sessionId: String(body?.sessionId ?? ''), kind: path.includes('ensure') ? 'ensure' : 'refresh' })
      return json({ sessionId: String(body?.sessionId ?? ''), digest: digests[String(body?.sessionId ?? '')] ?? null })
    }
    // Lazy passage for one hit (hover).
    if (path.indexOf('/talk-map/search-context') >= 0) {
      searchContextCalls.push({ sessionId: body?.sessionId, seq: body?.seq })
      return json({ lines: ['上文第一行', '上文第二行', '…按 SI 单位换算 Matter.js 的物理参数…', '下文第一行', '下文第二行'] })
    }
    if (path.indexOf('/talk-map/search') >= 0) {
      if (searchRouteFails) return Promise.resolve(new Response(JSON.stringify({ error: searchRouteMessage }), { status: 500, headers: { 'content-type': 'application/json' } }))
      searchRouteCalls.push(String(body?.query ?? ''))
      searchRouteScopes.push(String(body?.cwd ?? ''))
      const query = String(body?.query ?? '')
      // Grouped shape: one conversation, two matched lines.
      const items = query.includes('物理') || query.includes('Matter')
        ? [{
          sessionId: 's3',
          blocks: [
            ['…按 SI 单位换算 Matter.js 的物理参数…'],
            ['…物理量单位统一走 PX_PER_M…'],
          ],
          seqs: [42, 43],
        }]
        : []
      return json({ items, hasMore: false })
    }
    // The card body is the user's last message now, not an LLM digest.
    if (path.indexOf('/talk-map/last-user') >= 0) {
      const texts = {}
      for (const sessionId of body?.sessionIds ?? []) {
        texts[sessionId] = userMessages[sessionId] ?? '你最后说的那句话'
      }
      return json({ texts })
    }
    return json({})
  }
  window.EventSource = class EventSourceStub {
    constructor(url) { this.url = url }
    addEventListener() {}
    close() {}
  }

  // ---- fake cordis context --------------------------------------------
  const registered = {}
  /** `main` entries by key — the map is one now, like the recycle bin's page. */
  const panels = {}
  const remoteListeners = new Map()
  let selectedPanel = null
  /** The fake shell's sidebar: the map folds it away while it is open. */
  let sidebarCollapsed = false
  /** Lets the probe simulate a preset RPC that answers nothing (real failure). */
  let presetsFail = false
  const ctx = {
    sessions: {
      // ctx.sessions.list is itself the list surface (getSnapshot/subscribe).
      list: {
        getSnapshot: () => sessionsState,
        subscribe: () => () => {},
      },
      open: (id) => { log('openSession', id) },
    },
    workspaces: { list: { getSnapshot: () => workspacesState, subscribe: () => () => {} } },
    connection: {
      // The real unary RPC face: rpc.call(channel, endpoint, { args }) → { ok, value }.
      rpc: {
        call: (channel, endpoint, payload) => {
          log('rpc.call', { channel, endpoint, args: payload?.args })
          if (endpoint === 'session/create') {
            const request = payload?.args?.request ?? {}
            spawnCount += 1
            const sessionId = 's-spawn-' + spawnCount
            sessionRows[sessionId] = session(sessionId, '连线新建的对话', { updatedAt: Date.now() })
            const workspace = workspaceList.find(item => item.workspaceId === request.workspaceId)
            if (workspace !== undefined) workspace.sessionIds = [...workspace.sessionIds, sessionId]
            sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
            workspacesState = buildWorkspaces()
            sync()
            log('rpc.create', request)
            return Promise.resolve({ ok: true, value: { sessionId } })
          }
          if (endpoint === 'session/search') {
            if (searchRpcFails) {
              return Promise.resolve({ ok: false, error: { code: 'gateway/unavailable', message: 'rpc surface unavailable' } })
            }
            const query = String(payload?.args?.request?.query ?? '')
            log('rpc.search', { query })
            // Fixture: the word appears in a conversation that is NOT on the map.
            const hits = query.includes('物理') || query.includes('Matter')
              ? [{ sessionId: 's3', blocks: [['用 **物理参数** 换算']] }]
              : []
            return Promise.resolve({ ok: true, value: { items: hits, hasMore: false } })
          }
          if (endpoint === 'session/prompt') {
            log('rpc.prompt', payload?.args?.request)
            return Promise.resolve({ ok: true, value: { accepted: true } })
          }
          if (endpoint === 'workspace/create') {
            log('rpc.workspaceCreate', payload?.args?.request)
            return Promise.resolve({ ok: true, value: { workspace: { workspaceId: 'ws-created' }, created: true } })
          }
          if (endpoint === 'workspace/rename') {
            const request = payload?.args?.request ?? {}
            const workspace = workspaceList.find(item => item.workspaceId === request.workspaceId)
            if (workspace !== undefined) workspace.title = request.title
            workspacesState = buildWorkspaces()
            sync()
            return Promise.resolve({ ok: true, value: { workspaceId: request.workspaceId, title: request.title } })
          }
          if (endpoint === 'session/rename') {
            const request = payload?.args?.request ?? {}
            const row = sessionRows[request.sessionId]
            if (row !== undefined) sessionRows[request.sessionId] = { ...row, displayTitle: request.title }
            sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
            sync()
            return Promise.resolve({ ok: true, value: { title: request.title, seq: 1 } })
          }
          return Promise.resolve({ ok: false, error: { code: 'gateway/bad-request', message: 'unknown endpoint ' + String(endpoint) } })
        },
      },
      api: {
      // RPC results, not HTTP responses: `{ result: { ok, value } }`.
      llm: { models: () => Promise.resolve({ result: { ok: true, value: { groups: [
        { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-v4-pro', name: 'V4 Pro' }] },
      ] } } }) },
      agentPresets: { list: () => presetsFail
        ? Promise.reject(new Error('preset rpc unavailable'))
        : Promise.resolve({ result: { ok: true, value: { presets: [
          { id: 'standard', name: '标准模式' }, { id: 'cordis', name: '创造模式' },
        ] } } }) },
      workspace: { create: () => Promise.resolve({ result: { ok: true, value: { workspace: { workspaceId: 'ws-new' } } } }) },
      },
    },
    uiWorkspace: {
      openSession: (id) => log('ui.openSession', id),
      startSession: (workspaceId, options) => log('ui.startSession', { workspaceId, options }),
      forkSession: () => Promise.resolve('s-fork'),
      // The shipped pin: flipping it must come back through workspaces.list.
      pinSession: (sessionId) => {
        log('ui.pinSession', sessionId)
        if (!pinnedSessionIds.includes(sessionId)) pinnedSessionIds = [...pinnedSessionIds, sessionId]
        workspacesState = buildWorkspaces()
        sync()
        return Promise.resolve({ ok: true })
      },
      unpinSession: (sessionId) => {
        log('ui.unpinSession', sessionId)
        pinnedSessionIds = pinnedSessionIds.filter(id => id !== sessionId)
        workspacesState = buildWorkspaces()
        sync()
        return Promise.resolve({ ok: true })
      },
      archiveSession: (sessionId, options) => {
        log('ui.archiveSession', { sessionId, options })
        archivedSessionIds = [...archivedSessionIds, sessionId]
        workspacesState = buildWorkspaces()
        sync()
        return Promise.resolve()
      },
    },
    // Panel navigation: the map registers a `main` entry and selects it here,
    // exactly like the recycle bin / Plugins page do in the real shell.
    layout: {
      selectPanel(panelId) {
        if (panelId !== null && panels[panelId] === undefined) {
          throw new Error(`selectPanel: no main entry registered for ${panelId}`)
        }
        selectedPanel = panelId
        sync()
      },
      toggleSidebar() {
        sidebarCollapsed = !sidebarCollapsed
        log('layout.toggleSidebar', { collapsed: sidebarCollapsed })
        sync()
      },
    },
    effect(fn) { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {} },
    slots: {
      inject(_name, callback) { callback() },
      register(descriptor, component) {
        registered[descriptor.name] = { descriptor, component }
        if (descriptor.name === 'main' && typeof descriptor.key === 'string') panels[descriptor.key] = component
        return () => {
          delete registered[descriptor.name]
          if (descriptor.name === 'main') delete panels[descriptor.key]
        }
      },
    },
    get(name) { return ctx[name] },
    inject() {},
    // The Host event stream: api-session/error is what the red lamp reads.
    remote: {
      $on(event, listener) {
        remoteListeners.set(event, listener)
        return () => { remoteListeners.delete(event) }
      },
    },
  }

  const logEntries = []
  function log(kind, detail) {
    logEntries.push({ kind, detail })
    console.log('[harness]', kind, detail)
  }

  // ---- mount -----------------------------------------------------------
  let root = null
  const props = {
    useSessions: (select) => select ? select(sessionsState) : sessionsState,
    useWorkspaces: (select) => select ? select(workspacesState) : workspacesState,
    useSessionStatus: (select) => select ? select(statusById) : statusById,
  }

  function sync() {
    const MapPanel = panels['talk-map']
    const Toggle = registered['sidebar.footer.action']?.component
    if (root === null) {
      root = ReactDOM.createRoot(document.getElementById('host'))
    }
    const h = React.createElement
    // A miniature shell: sidebar column (with this plugin's footer action, which
    // is how the map learns whether the sidebar is already a rail) + main column.
    root.render(h('div', { style: { display: 'flex', height: '100vh', minHeight: 0 } },
      h('div', {
        'data-harness-sidebar': sidebarCollapsed ? 'rail' : 'wide',
        style: {
          flex: 'none',
          width: sidebarCollapsed ? 56 : 220,
          borderRight: '1px solid #33363d',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 8,
          boxSizing: 'border-box',
          background: '#1f2126',
        },
      }, Toggle === undefined ? null : h(Toggle, { wide: !sidebarCollapsed })),
      h('div', { style: { flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' } },
        selectedPanel === 'talk-map' && MapPanel !== undefined
          ? h(MapPanel, props)
          : h('div', {
              'data-harness-placeholder': 'conversation',
              style: { padding: 24, fontSize: 13, color: '#8b90a0' },
            }, '会话（占位）')),
    ))
  }

  window.__harness = {
    boot() {
      const entry = registry['dsh-talk-map']
      if (entry === undefined) throw new Error('client.js did not reach __ModuleLoader__')
      const moduleExports = entry.factory((id) => {
        if (id === 'react') return React
        if (id === 'react-dom') return ReactDOM
        if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime') return jsxRuntime
        if (id === 'react-dom/client') return { createRoot: ReactDOM.createRoot }
        throw new Error(`harness has no module ${id}`)
      })
      moduleExports.apply(ctx)
      sync()
      // The overlay subscribes to the map-ui store; the plugin's own hotkey
      // (alt+F) is the supported way to open it, so drive that.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true, bubbles: true }))
      return { registered: Object.keys(registered), panels: Object.keys(panels), selectedPanel }
    },
    sync,
    posts,
    log: logEntries,
    state: () => payload,
    getRoot: () => root,
    panelState: () => ({ selectedPanel }),
    /** Every dsh-recycle-bin POST the map made (delete path). */
    recycleCalls: () => recycleCalls.slice(),
    /** Refuse the next N moves with session-open (1 = only the first). */
    recycleBusy(on, times = 1) {
      recycleBusyFlag = on
      recycleBusyLeft = on ? times : 0
    },
    pinned: () => pinnedSessionIds.slice(),
    /** What the fake shell's sidebar looks like right now. */
    sidebarState: () => ({
      collapsed: sidebarCollapsed,
      width: document.querySelector('[data-harness-sidebar]')?.getBoundingClientRect().width ?? 0,
      toggles: logEntries.filter(entry => entry.kind === 'layout.toggleSidebar').length,
    }),
    /** Pretend this conversation just sent a message: bump its stamp + re-render. */
    touch(sessionId) {
      if (sessionRows[sessionId] === undefined) throw new Error(`unknown session ${sessionId}`)
      sessionRows[sessionId] = { ...sessionRows[sessionId], updatedAt: Date.now() }
      sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
      sync()
    },
    /** 'fail' = the preset RPC rejects (a cold boot / unavailable build). */
    setPresetsMode(mode) {
      presetsFail = mode === 'fail'
    },
    /**
     * A whole new WORKSPACE appears (the user imported a session in a fresh cwd).
     * The map has no folder for it, so the auto-sync on open has to create one.
     */
    addWorkspace(workspaceId, title, sessionId, sessionTitle) {
      sessionRows[sessionId] = session(sessionId, sessionTitle, { updatedAt: Date.now() })
      workspaceList.push({ workspaceId, title, path: 'D:/Projects/' + workspaceId, sessionIds: [sessionId] })
      sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
      workspacesState = buildWorkspaces()
      sync()
    },
    /** A brand-new session lands in this workspace (no card yet). */
    addSession(workspaceId, sessionId, title) {
      sessionRows[sessionId] = session(sessionId, title, { updatedAt: Date.now() })
      const workspace = workspaceList.find(item => item.workspaceId === workspaceId)
      if (workspace === undefined) throw new Error(`unknown workspace ${workspaceId}`)
      workspace.sessionIds = [...workspace.sessionIds, sessionId]
      sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
      workspacesState = buildWorkspaces()
      sync()
    },
    /**
     * Repaint the session list every 150ms, the way a running turn keeps the
     * shell updating. Used to prove the card-body request is not starved by that
     * churn (a debounce restarted by every change would never fire).
     */
    churn(on) {
      if (churnTimer !== undefined) {
        clearInterval(churnTimer)
        churnTimer = undefined
      }
      if (!on) return
      churnTimer = setInterval(() => {
        sessionRows.s8 = { ...sessionRows.s8, updatedAt: Date.now() }
        sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
        sync()
      }, 150)
    },
    /** Make the card-body route slow, to prove the local cache paints first. */
    slowPreviews(ms) {
      previewDelayMs = ms
    },
    /** Raise the Host's api-session/error for one session (the red lamp). */
    raiseError(sessionId) {
      remoteListeners.get('api-session/error')?.(sessionId, 'boom')
    },
    /**
     * Flip a session's running flag. Proves the map's OWN "finished while the map
     * was up" tracking — this harness never sets completionUnread by itself.
     */
    setRunning(sessionId, running) {
      const next = new Map(statusById)
      const fact = { ...(next.get(sessionId) ?? {}) }
      if (running) fact.running = true
      else delete fact.running
      next.set(sessionId, fact)
      statusById = next
      sessionRows[sessionId] = { ...sessionRows[sessionId], running, updatedAt: Date.now() }
      sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
      sync()
    },
    /**
     * The user opened this session from somewhere else (a desktop notification,
     * the sidebar): the shell marks the completion read and clears the status
     * bit — the map must stop showing its own 待查看 mark.
     */
    /**
     * The shell flags a completion as unread (what a real deployment does when a
     * run ends while the conversation is not on screen).
     */
    hostUnread(sessionId) {
      const next = new Map(statusById)
      const fact = { ...(next.get(sessionId) ?? {}) }
      fact.completionUnread = true
      next.set(sessionId, fact)
      statusById = next
      sync()
    },
    /**
     * The shell reports the completion as "not unread" WITHOUT ever flagging it —
     * what a real deployment does when the conversation is still the main view
     * (the map is covering it). This used to kill our lamp.
     */
    hostNotUnread(sessionId) {
      const next = new Map(statusById)
      const fact = { ...(next.get(sessionId) ?? {}) }
      fact.completionUnread = false
      next.set(sessionId, fact)
      statusById = next
      sync()
    },
    notificationJump(sessionId) {
      const next = new Map(statusById)
      const fact = { ...(next.get(sessionId) ?? {}) }
      delete fact.running
      fact.completionUnread = false
      next.set(sessionId, fact)
      statusById = next
      sessionRows[sessionId] = { ...sessionRows[sessionId], running: false }
      sessionsState = { ids: Object.keys(sessionRows), byId: { ...sessionRows } }
      sync()
    },
    /** Make the connection RPC path fail, forcing the Host-route fallback. */
    failSearchRpc(fail) {
      searchRpcFails = fail === true
    },
    slowSearch(ms) {
      searchDelayMs = Number(ms) || 0
    },
    failSearchRoute(fail) {
      searchRouteFails = fail === true
    },
    /** Make the route answer with a specific message (e.g. index disabled). */
    searchRouteError(text) {
      searchRouteMessage = String(text)
    },
    searchRouteCalls() {
      return searchRouteCalls.slice()
    },
    /** The cwd scope of each search request ('' = global). */
    searchRouteScopes() {
      return searchRouteScopes.slice()
    },
    /** Which hits asked for their passage (hover), and when. */
    digestCalls() { return [...digestCalls] },
    searchContextCalls() {
      return searchContextCalls.slice()
    },
    /** Which conversations asked for their extra hits (the ＋ button). */
    searchSessionCalls() {
      return searchSessionCalls.slice()
    },
    nodeBoxes() {
      const out = { cards: {}, frames: {} }
      for (const el of document.querySelectorAll('.react-flow__node')) {
        const id = el.getAttribute('data-id')
        const r = el.getBoundingClientRect()
        const box = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
        if (id && id.startsWith('frame-')) out.frames[id.slice(6)] = box
        else if (id) out.cards[id] = box
      }
      return out
    },
  }
})()
