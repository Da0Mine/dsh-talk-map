import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')
const before = `    items.push({
      key: 'remove-group',
      icon: 'delete',
      label: t('menu.removeGroup'),
      onPick: () => {
        removeGroup(groupId)
        close()
      },
    })`
const after = `    items.push({
      key: 'remove-group',
      icon: 'delete',
      label: t('menu.removeGroup'),
      // Red row, no dialog: clicking it deletes now (recycle bin when one answers, the
      // Host's own delete otherwise).
      danger: true,
      onPick: () => {
        close()
        void deleteWorkspace(groupId)
      },
    })`
if (!text.includes(before)) { console.log('menu snippet not found'); process.exit(1) }
text = text.replace(before, after)
fs.writeFileSync(file, text, 'utf8')
console.log('menu now calls deleteWorkspace + danger')
