import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')
const before = [
  "    items.push({",
  "      key: 'remove-group',",
  "      icon: 'delete',",
  "      label: t('menu.removeGroup'),",
  "      onPick: () => {",
  "        removeGroup(groupId)",
  "        close()",
  "      },",
  "    })",
].join('\n')
const after = [
  "    items.push({",
  "      key: 'remove-group',",
  "      icon: 'delete',",
  "      label: t('menu.removeGroup'),",
  "      // Red row, and no dialog: the colour is the confirmation. Clicking it deletes now —",
  "      // into the recycle bin when one answers, through the Host's own delete otherwise.",
  "      danger: true,",
  "      onPick: () => {",
  "        close()",
  "        void deleteWorkspace(groupId)",
  "      },",
  "    })",
].join('\n')
if (!text.includes(before)) { console.log('exact snippet still not found'); process.exit(1) }
text = text.replace(before, after)
fs.writeFileSync(file, text, 'utf8')
console.log('menu item now: danger + deleteWorkspace')
