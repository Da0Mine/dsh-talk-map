#!/usr/bin/env node
/**
 * The package publishes its Host half as `lib/index.js` (package.json `exports["."]` and
 * `files` both name it), while tsdown's default output is `dist/index.mjs`. Copy one to the
 * other so a plain `npm run build` cannot leave a stale Host bundle behind — that is how
 * the 0.1.x line once shipped a lib/ that predated the source.
 */
import fs from 'node:fs'

const from = 'dist/index.mjs'
const to = 'lib/index.js'
if (!fs.existsSync(from)) {
  console.error(`copy-host: ${from} missing — run tsdown first`)
  process.exit(1)
}
fs.mkdirSync('lib', { recursive: true })
const body = fs.readFileSync(from)
fs.writeFileSync(to, body)
const kb = (body.length / 1024).toFixed(1)
console.log(`copy-host: ${from} → ${to} (${kb} kB)`)
