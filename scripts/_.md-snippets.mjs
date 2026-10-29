/** Use the inline-Markdown renderer for snippets in both search surfaces. */
import fs from 'node:fs'

// ---- SearchResults ----------------------------------------------------
let shared = fs.readFileSync('src/client/SearchResults.tsx', 'utf8')
shared = shared.replace(
  `import { t } from './i18n.ts'`,
  `import { renderMarkdownInline } from './markdown-inline.tsx'\nimport { t } from './i18n.ts'`,
)
const oldLine = `                  {highlight(matched, props.query)}`
if (!shared.includes(oldLine)) {
  console.error('SearchResults snippet line not found')
  process.exit(1)
}
shared = shared.replace(
  oldLine,
  `                  {renderMarkdownInline(matched, props.query).nodes}`,
)
// the peek body is full text: render it as Markdown too
shared = shared.replace(
  `                <div key={index} className={styles['peekLine']}>{highlight(line, props.query)}</div>`,
  `                <div key={index} className={styles['peekLine']}>{renderMarkdownInline(line, props.query).nodes}</div>`,
)
fs.writeFileSync('src/client/SearchResults.tsx', shared, 'utf8')

// ---- StackDrawer (its own hit rendering) ------------------------------
let drawer = fs.readFileSync('src/client/StackDrawer.tsx', 'utf8')
if (!drawer.includes("import { renderMarkdownInline }")) {
  drawer = drawer.replace(
    `import { drawerState } from './drawer-state.ts'`,
    `import { drawerState } from './drawer-state.ts'\nimport { renderMarkdownInline } from './markdown-inline.tsx'`,
  )
}
const drawerLine = `                            {highlight(matched, query)}`
if (!drawer.includes(drawerLine)) {
  console.error('drawer snippet line not found')
  process.exit(1)
}
drawer = drawer.replace(drawerLine, `                            {renderMarkdownInline(matched, query).nodes}`)
fs.writeFileSync('src/client/StackDrawer.tsx', drawer, 'utf8')

console.log('snippets render inline markdown')
