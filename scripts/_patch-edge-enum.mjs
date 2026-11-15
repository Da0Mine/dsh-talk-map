import fs from 'node:fs'
const file = 'src/host/store.ts'
let text = fs.readFileSync(file, 'utf8')
const before = "  kind: z.enum(['digest', 'full', 'selection', 'none', 'link']),"
const after = "  kind: z.enum(['digest', 'context', 'full', 'selection', 'none', 'link']),"
if (!text.includes(before)) throw new Error('enum not found')
fs.writeFileSync(file, text.replace(before, after), 'utf8')
console.log('edgeInjectionSchema kind += context')
