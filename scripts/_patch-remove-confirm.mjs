import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) menu item: red + ask first
text = text.replace(
  `    items.push({
      key: 'remove-group',
      icon: 'delete',
      label: t('menu.removeGroup'),
      onPick: () => {
        removeGroup(groupId)
        close()
      },
    })`,
  `    items.push({
      key: 'remove-group',
      icon: 'delete',
      label: t('menu.removeGroup'),
      // Destructive-looking, and it only touches the board — so it asks first.
      danger: true,
      onPick: () => {
        close()
        setConfirmRemove({ groupId, count: (membersByGroup.get(groupId) ?? []).length })
      },
    })`,
)

// 2) state
text = text.replace(
  "  const [renameTarget, setRenameTarget]",
  "  const [confirmRemove, setConfirmRemove] = useState<{ groupId: string; count: number } | null>(null)\n  const [renameTarget, setRenameTarget]",
)

// 3) overlay, next to the other dialogs
text = text.replace(
  "      {menuState !== null",
  `      {confirmRemove !== null
        ? (
          <div
            className={styles['dangerBackdrop']}
            role="presentation"
            onClick={() => { setConfirmRemove(null) }}
          >
            <div
              className={styles['dangerDialog']}
              role="dialog"
              aria-modal="true"
              aria-label={t('confirm.removeGroup.title')}
              onClick={(event) => { event.stopPropagation() }}
            >
              <div className={styles['dangerTitle']}>{t('confirm.removeGroup.title')}</div>
              <div className={styles['dangerBody']}>
                {t('confirm.removeGroup.body', { n: String(confirmRemove.count) })}
              </div>
              <div className={styles['dangerActions']}>
                <button type="button" className={styles['dangerCancel']} onClick={() => { setConfirmRemove(null) }}>
                  {t('confirm.cancel')}
                </button>
                <button
                  type="button"
                  className={styles['dangerOk']}
                  onClick={() => {
                    removeGroup(confirmRemove.groupId)
                    setConfirmRemove(null)
                  }}
                >
                  {t('confirm.removeGroup.ok')}
                </button>
              </div>
            </div>
          </div>
        )
        : null}
      {menuState !== null`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('remove-group: danger + confirm wired')
