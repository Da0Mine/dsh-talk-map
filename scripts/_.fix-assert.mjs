import fs from 'node:fs'

const file = 'test/edge-flow.test.mjs'
let source = fs.readFileSync(file, 'utf8')
source = source.replace(
  /assert\.match\(bundle, \/opacity: hidden \\\\\? 0 : 1\/, "a synced line must be invisible"\)/,
  'assert.match(bundle, /opacity: hidden \\? 0 : 1/, \'a synced line must be invisible\')',
)
fs.writeFileSync(file, source, 'utf8')
console.log(source.split('\n').filter(line => line.includes('invisible')).join('\n'))
