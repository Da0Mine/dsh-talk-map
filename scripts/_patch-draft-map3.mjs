import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
const lines = fs.readFileSync(file, 'utf8').split('\n')

// A) 定时器：定位 draftWatch.refresh() 那一行，插 syncTexts
const timerAt = lines.findIndex(l => l.includes('const timer = setInterval(() => { draftWatch.refresh() }, 1500)'))
if (timerAt < 0) { console.log('timer line not found'); process.exit(1) }
const indent = lines[timerAt].match(/^\s*/)[0]
lines[timerAt] = indent + 'const syncTexts = (): void => {'
lines.splice(timerAt + 1, 0,
  indent + '  const next = readDraftTexts()',
  indent + '  setDraftTexts((current) => {',
  indent + '    const keys = Object.keys(next)',
  indent + '    if (keys.length === Object.keys(current).length && keys.every(key => current[key] === next[key])) return current',
  indent + '    return next',
  indent + '  })',
  indent + '}',
  indent + 'syncTexts()',
  indent + 'const timer = setInterval(() => {',
  indent + '  draftWatch.refresh()',
  indent + '  syncTexts()',
  indent + '}, 1500)',
)
fs.writeFileSync(file, lines.join('\n'), 'utf8')
console.log('timer patched at line', timerAt + 1)
