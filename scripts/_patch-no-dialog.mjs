import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) menu item: delete immediately (no dialog), keep the destructive styling
text = text.replace(
  `      danger: true,
      onPick: () => {
        close()
        // Ask first whether a recycle bin answers: with one the group goes there and stays
        // restorable; without one we fall back to the Host's own delete.
        void recycleBinReady().then((bin) => {
          setConfirmRemove({ groupId, count: (membersByGroup.get(groupId) ?? []).length, bin })
        })
      },`,
  `      danger: true,
      onPick: () => {
        // No dialog: the red row IS the confirmation. Delete now — into the recycle bin
        // when one answers, straight through the Host's delete when there is none.
        close()
        void deleteWorkspace(groupId)
      },`,
)

// 2) drop the confirm state and its overlay
text = text.replace(
  "  const [confirmRemove, setConfirmRemove] = useState<{ groupId: string; count: number; bin: boolean } | null>(null)\n",
  '',
)
const start = text.indexOf("      {confirmRemove !== null")
if (start < 0) { console.log('dialog block not found'); process.exit(1) }
const endMarker = "      {menuState !== null"
const end = text.indexOf(endMarker, start)
if (end < 0) { console.log('dialog end not found'); process.exit(1) }
text = text.slice(0, start) + text.slice(end)

// 3) toast: pick the right wording from the same probe the delete already does
text = text.replace(
  "      showToast(t(bin ? 'toast.workspaceTrashed' : 'toast.workspaceDeleted', { n: String(sessionIds.length) }))",
  "      showToast(t(bin ? 'toast.workspaceTrashed' : 'toast.workspaceDeleted', { n: String(sessionIds.length) }))",
)
fs.writeFileSync(file, text, 'utf8')
console.log('dialog removed; menu deletes immediately')
