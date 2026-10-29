/** Loading state + a more refined motion vocabulary. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- SearchResults: skeleton while searching --------------------------
let shared = fs.readFileSync('src/client/SearchResults.tsx', 'utf8')
shared = shared.replace(
  `import { renderMarkdownInline } from './markdown-inline.tsx'`,
  `import { renderMarkdownInline } from './markdown-inline.tsx'\nimport { SearchLoading } from './SearchLoading.tsx'`,
)
shared = shared.replace(
  J([
    '      <div className={styles[\'drawerHitsHead\']}>',
    '        {props.heading}',
    "        {props.searching ? ' · ' + t('stack.searching') : ''}",
    '      </div>',
  ]),
  J([
    '      <div className={styles[\'drawerHitsHead\']}>',
    '        {props.searching ? t(\'stack.searching\') : props.heading}',
    '      </div>',
    '      {props.searching ? <SearchLoading rows={2} /> : null}',
  ]),
)
fs.writeFileSync('src/client/SearchResults.tsx', shared, 'utf8')

// ---- StackDrawer: same skeleton --------------------------------------
let drawer = fs.readFileSync('src/client/StackDrawer.tsx', 'utf8')
if (!drawer.includes("import { SearchLoading }")) {
  drawer = drawer.replace(
    `import { renderMarkdownInline } from './markdown-inline.tsx'`,
    `import { renderMarkdownInline } from './markdown-inline.tsx'\nimport { SearchLoading } from './SearchLoading.tsx'`,
  )
}
// the drawer prints its own status line next to the input; reuse the skeleton
const drawerHitsHead = `                  <div className={styles['drawerHitsHead']}>`
if (drawer.includes(drawerHitsHead)) {
  drawer = drawer.replace(
    drawerHitsHead,
    `                  {searching ? <SearchLoading rows={2} /> : null}\n` + drawerHitsHead,
  )
}
fs.writeFileSync('src/client/StackDrawer.tsx', drawer, 'utf8')

console.log('loading skeleton wired')
