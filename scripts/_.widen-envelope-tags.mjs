/**
 * One-off follow-up: the `[model changed: …]` tag can exceed the general tag
 * length and it runs to the end of its block, so widen the generic tag rule and
 * add an explicit cut for it. Applies to the client, the src host and the
 * hand-patched built host bundle. Idempotent.
 */
import fs from 'node:fs'

const files = ['src/client/preview-text.ts', 'src/host/routes.ts', 'lib/index.js']
const explicit = [
  [/^\s*\[model changed:[\s\S]*$/im, ' '],
]

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8')
  const before = text
  text = text.replaceAll('[a-z][^\\]]{0,90}', '[a-z][^\\]]{0,200}')
  if (!text.includes('model changed:[')) {
    // client (array form) and src host (out = out.replace form) both use this shape
    text = text.replace(
      /(The approval policy changed\[\\s\\S\]\*\$\/im,? "? ?"?\);?\n)/,
      '$1',
    )
  }
  if (text !== before) fs.writeFileSync(file, text, 'utf8')
}

// Add the explicit model-changed pattern in each dialect.
function addAfter(file, anchor, insert) {
  let text = fs.readFileSync(file, 'utf8')
  if (text.includes('\\[model changed:')) return false
  if (!text.includes(anchor)) return false
  text = text.replace(anchor, anchor + insert)
  fs.writeFileSync(file, text, 'utf8')
  return true
}

// client: array entries
addAfter(
  'src/client/preview-text.ts',
  "  [/^The approval policy changed[\\s\\S]*$/im, ' '],\n",
  "  [/^\\[model changed:[\\s\\S]*$/im, ' '],\n",
)
// src host + bundle: statement form
addAfter(
  'src/host/routes.ts',
  "  out = out.replace(/^The approval policy changed[\\s\\S]*$/im, ' ')\n",
  "  out = out.replace(/^\\[model changed:[\\s\\S]*$/im, ' ')\n",
)
addAfter(
  'lib/index.js',
  '\tout = out.replace(/^The approval policy changed[\\s\\S]*$/im, " ");\n',
  '\tout = out.replace(/^\\[model changed:[\\s\\S]*$/im, " ");\n',
)

console.log('widened tag length + explicit [model changed] rule')
