import fs from 'node:fs'
const file = 'scripts/_rail-open-check2.mjs'
let text = fs.readFileSync(file, 'utf8')
text = text.replace("await openMap()\nconst openRail", "// the demo already boots with the map open (Alt+F would close it)\nconst openRail")
fs.writeFileSync(file, text, 'utf8')
console.log('fixed the initial openMap')
