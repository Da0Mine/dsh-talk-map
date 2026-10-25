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
  ]
  const titles = {
    s1: '对话地图插件改版', s2: '桌面自动化脚本清理', s3: 'DSH 会话日志解析',
    s4: 'Matter.js 物理参数换算', s5: '云盘同步目录整理',
    s6: '医学影像标注流程', s7: '标注工具离线化', s8: '数据集切分脚本',
    s9: '代理端口探测',
  }
  for (const ws of workspaceList) {
    for (const id of ws.sessionIds) sessionRows[id] = session(id, titles[id])
  }
  sessionRows.s1.running = true
  sessionRows.s3.updatedAt = T0 - 90 * MIN
  sessionRows.s8.blank = true // a blank session must not render a card

  const sessionsState = { ids: Object.keys(sessionRows), byId: sessionRows }
  const workspacesState = { items: workspaceList, baselinesReady: true }
  const statusById = new Map([['s1', { running: true }]])

  const PAD = 32
  const LABEL = 30
  const CARD_W = 224
  const CARD_H = 120
  const GAP_X = 48
  const GAP_Y = 56

  function frame(id) {
    const ws = workspaceList.find(w => w.workspaceId === id)
    const cols = Math.max(1, ws.sessionIds.length <= 1 ? 1 : 3)
    const rows = Math.ceil(ws.sessionIds.length / cols)
    return {
      x: id === 'ws-medkit' ? 960 : 0,
      y: id === 'ws-lab' ? 640 : 0,
      width: cols * (CARD_W + GAP_X) - GAP_X + PAD * 2,
      height: rows * (CARD_H + GAP_Y) - GAP_Y + PAD * 2 + LABEL,
    }
  }

  const frames = { 'ws-daily': frame('ws-daily'), 'ws-medkit': frame('ws-medkit'), 'ws-lab': frame('ws-lab') }

  const cards = {}
  let counter = 0
  for (const ws of workspaceList) {
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

  const digests = {
    s1: { atSeq: 12, summary: '把卡片改成网格槽位，含退让与补位动画。', keyFindings: [], nextStep: '补完工作区伸缩与双击新建', generatedAt: T0 },
    s2: { atSeq: 8, summary: '清理临时截图与旧脚本，统一放回收区。', keyFindings: [], nextStep: '核对 skill 内嵌脚本', generatedAt: T0 - 20 * MIN },
    s6: { atSeq: 5, summary: '标注流程拆成标注、复核两段。', keyFindings: [], nextStep: '补离线包说明', generatedAt: T0 - 200 * MIN },
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
    edges: {},
    digests,
    global: globalState,
  }

  // ---- fetch / EventSource mocks ---------------------------------------
  const posts = []
  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { 'content-type': 'application/json' },
    }))
  }
  window.fetch = function (url, init) {
    const path = String(url)
    if (init && init.method === 'POST') {
      let body = null
      try { body = JSON.parse(init.body) } catch { body = init.body }
      posts.push({ path, body })
      return json({ ok: true })
    }
    if (path.indexOf('/talk-map/state') >= 0) return json(payload)
    if (path.indexOf('/talk-map/defaults') >= 0) {
      return json({ model: { provider: 'deepseek', model: 'deepseek-v4-pro' }, preset: 'standard' })
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
    connection: { api: {
      // RPC results, not HTTP responses: `{ result: { ok, value } }`.
      llm: { models: () => Promise.resolve({ result: { ok: true, value: { groups: [
        { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-v4-pro', name: 'V4 Pro' }] },
      ] } } }) },
      agentPresets: { list: () => Promise.resolve({ result: { ok: true, value: { presets: [
        { id: 'standard', name: '标准模式' }, { id: 'cordis', name: '创造模式' },
      ] } } }) },
      workspace: { create: () => Promise.resolve({ result: { ok: true, value: { workspace: { workspaceId: 'ws-new' } } } }) },
    } },
    uiWorkspace: {
      openSession: (id) => log('ui.openSession', id),
      startSession: (workspaceId, options) => log('ui.startSession', { workspaceId, options }),
      forkSession: () => Promise.resolve('s-fork'),
    },
    effect(fn) { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {} },
    slots: {
      inject(_name, callback) { callback() },
      register(descriptor, component) {
        registered[descriptor.name] = { descriptor, component }
        return () => { delete registered[descriptor.name] }
      },
    },
    get(name) { return ctx[name] },
    inject() {},
    remote: undefined,
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
    const Overlay = registered['shell.overlay']?.component
    if (Overlay === undefined) throw new Error('shell.overlay was never registered')
    if (root === null) {
      root = ReactDOM.createRoot(document.getElementById('host'))
    }
    root.render(React.createElement(Overlay, props))
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
      return { registered: Object.keys(registered) }
    },
    sync,
    posts,
    log: logEntries,
    state: () => payload,
    getRoot: () => root,
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
