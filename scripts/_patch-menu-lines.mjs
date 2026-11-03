import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const keyAt = lines.findIndex(line => line.includes("key: 'remove-group'"))
if (keyAt < 0) { console.log('anchor missing'); process.exit(1) }
const indent = lines[keyAt].match(/^\s*/)[0]          // e.g. six spaces
const inner = indent + '  '
// insert danger after the label line
const labelAt = keyAt + 2
if (!lines[labelAt].includes("label: t('menu.removeGroup')")) { console.log('label line moved:', lines[labelAt]); process.exit(1) }
lines.splice(labelAt + 1, 0,
  inner + '// Red row and no dialog: the colour is the confirmation. Clicking deletes now —',
  inner + '// into the recycle bin when one answers, through the Host\'s own delete otherwise.',
  inner + 'danger: true,',
)
// rewrite the two body lines
const removeAt = lines.findIndex(line => line.trim() === 'removeGroup(groupId)')
if (removeAt < 0) { console.log('removeGroup call missing'); process.exit(1) }
const callIndent = lines[removeAt].match(/^\s*/)[0]
lines[removeAt] = callIndent + 'close()'
lines.splice(removeAt + 1, 0, callIndent + 'void deleteWorkspace(groupId)')
// drop the now-duplicated close() that used to follow the call
const dupAt = lines.findIndex((line, index) => index > removeAt + 2 && line.trim() === 'close()')
if (dupAt >= 0 && dupAt <= removeAt + 3) lines.splice(dupAt, 1)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('menu item patched by line index')
