import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) workspace delete now goes through the official trash seam, then clears the board
text = text.replace(
  "  const removeGroup = (groupId: string): void => {",
  `  /**
   * Delete a whole workspace the official way: every session in it goes through
   * \`trashSessions\` (the same seam the sidebar's delete uses, which lands in the recycle
   * bin and is restorable), and only then is the frame and its cards taken off the board.
   */
  const deleteWorkspace = async (groupId: string): Promise<void> => {
    const sessionIds = (membersByGroup.get(groupId) ?? [])
      .map(cardId => visibleCards[cardId]?.sessionId)
      .filter((sessionId): sessionId is string => sessionId !== undefined)
    try {
      if (sessionIds.length > 0) {
        await trashSessions(sessionIds, () => { showToast(t('toast.stopping')) })
      }
      removeGroup(groupId)
      showToast(t('toast.workspaceTrashed', { n: String(sessionIds.length) }))
    } catch (error) {
      showToast(String((error as Error | undefined)?.message ?? error))
    }
  }

  const removeGroup = (groupId: string): void => {`,
)

// 2) confirm dialog: copy says recycle bin, and the OK button calls the official delete
text = text.replace(
  "                    removeGroup(confirmRemove.groupId)",
  "                    void deleteWorkspace(confirmRemove.groupId)",
)

fs.writeFileSync(file, text, 'utf8')
console.log('workspace delete wired to the trash seam')
