import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  "import { archiveSessions, setPinned, trashSessions } from './session-actions.ts'",
  "import { archiveSessions, deleteSessionsDirect, deleteWorkspaceRegistration, setPinned, trashSessions } from './session-actions.ts'",
)
text = text.replace(
  `      if (sessionIds.length > 0) {
        await trashSessions(sessionIds, () => { showToast(t('toast.stopping')) })
      }
      removeGroup(groupId)`,
  `      // The Host's own delete (session/delete), not the recycle-bin plugin: the user asked
      // for the system path, so nothing here depends on that plugin being installed.
      if (sessionIds.length > 0) await deleteSessionsDirect(sessionIds)
      await deleteWorkspaceRegistration(groupId)
      removeGroup(groupId)`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('workspace delete uses the system path')
