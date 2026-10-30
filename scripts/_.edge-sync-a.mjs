/** Edges remember WHEN they last delivered something (sync animation needs it). */
import fs from 'node:fs'

const file = 'src/shared/model.ts'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

source = source.replace(
  J([
    '  /** Pipe mode: source digest changes auto-push along this edge. */',
    '  autoSync?: boolean',
  ]),
  J([
    '  /** Pipe mode: source digest changes auto-push along this edge. */',
    '  autoSync?: boolean',
    '  /** When this edge last delivered context (manual push or auto push). */',
    '  lastPushAt?: number',
  ]),
)
if (!source.includes('lastPushAt?: number')) {
  console.error('model anchor missing')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('model: lastPushAt')
