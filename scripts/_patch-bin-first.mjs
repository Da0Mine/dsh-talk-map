import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) import the probe
text = text.replace(
  "import { archiveSessions, deleteSessionsDirect, deleteWorkspaceRegistration, setPinned, trashSessions } from './session-actions.ts'",
  "import { archiveSessions, deleteSessionsDirect, deleteWorkspaceRegistration, recycleBinReady, setPinned, trashSessions } from './session-actions.ts'",
)

// 2) confirm state carries whether the bin is there, so the dialog can say the truth
text = text.replace(
  "  const [confirmRemove, setConfirmRemove] = useState<{ groupId: string; count: number } | null>(null)",
  "  const [confirmRemove, setConfirmRemove] = useState<{ groupId: string; count: number; bin: boolean } | null>(null)",
)
text = text.replace(
  `        setConfirmRemove({ groupId, count: (membersByGroup.get(groupId) ?? []).length })`,
  `        // Ask first whether a recycle bin answers: with one the group goes there and stays
        // restorable; without one we fall back to the Host's own delete.
        void recycleBinReady().then((bin) => {
          setConfirmRemove({ groupId, count: (membersByGroup.get(groupId) ?? []).length, bin })
        })`,
)

// 3) delete: bin first, direct only when there is no bin
text = text.replace(
  `      // The Host's own delete (session/delete), not the recycle-bin plugin: the user asked
      // for the system path, so nothing here depends on that plugin being installed.
      if (sessionIds.length > 0) await deleteSessionsDirect(sessionIds)
      await deleteWorkspaceRegistration(groupId)
      removeGroup(groupId)`,
  `      // Recycle bin when one is installed (restorable, same bin as the sidebar); the Host's
      // own delete only as the fallback when there is none.
      const bin = await recycleBinReady()
      if (sessionIds.length > 0) {
        if (bin) {
          try {
            await trashSessions(sessionIds, () => { showToast(t('toast.stopping')) })
          } catch (error) {
            if (!/HTTP (404|405)|未注册|not found/i.test(String((error as Error).message))) throw error
            await deleteSessionsDirect(sessionIds)
            await deleteWorkspaceRegistration(groupId)
          }
        } else {
          await deleteSessionsDirect(sessionIds)
          await deleteWorkspaceRegistration(groupId)
        }
      }
      removeGroup(groupId)`,
)
text = text.replace(
  "      showToast(t('toast.workspaceTrashed', { n: String(sessionIds.length) }))",
  "      showToast(t(bin ? 'toast.workspaceTrashed' : 'toast.workspaceDeleted', { n: String(sessionIds.length) }))",
)

// 4) dialog copy follows the same flag
text = text.replace(
  "                {t('confirm.removeGroup.body', { n: String(confirmRemove.count) })}",
  "                {t(confirmRemove.bin ? 'confirm.removeGroup.body' : 'confirm.removeGroup.bodyHard', { n: String(confirmRemove.count) })}",
)
text = text.replace(
  "                  {t('confirm.removeGroup.ok')}",
  "                  {t(confirmRemove.bin ? 'confirm.removeGroup.ok' : 'confirm.removeGroup.okHard')}",
)
fs.writeFileSync(file, text, 'utf8')
console.log('bin first, direct as fallback')
