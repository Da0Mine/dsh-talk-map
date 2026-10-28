/** Mock the spawn RPCs in the harness (session/create, session/prompt, workspace/create). */
import fs from 'node:fs'

const file = 'test/harness.js'
let source = fs.readFileSync(file, 'utf8')

const anchor = `          if (endpoint === 'workspace/rename') {`
const added = `          if (endpoint === 'session/create') {
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
          if (endpoint === 'session/prompt') {
            log('rpc.prompt', payload?.args?.request)
            return Promise.resolve({ ok: true, value: { accepted: true } })
          }
          if (endpoint === 'workspace/create') {
            log('rpc.workspaceCreate', payload?.args?.request)
            return Promise.resolve({ ok: true, value: { workspace: { workspaceId: 'ws-created' }, created: true } })
          }
          if (endpoint === 'workspace/rename') {`

if (!source.includes(anchor)) {
  console.error('harness anchor missing')
  process.exit(1)
}
source = source.replace(anchor, added)

// a module-scope counter for minted session ids
source = source.replace(
  '  const minutesAgo = {',
  '  let spawnCount = 0\n  const minutesAgo = {',
)
fs.writeFileSync(file, source, 'utf8')
console.log('spawn RPC mocks added')
