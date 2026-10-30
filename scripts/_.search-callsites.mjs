/** Point both call sites at the new minimal SearchResults. */
import fs from 'node:fs'

function patch(file, edits) {
  let source = fs.readFileSync(file, 'utf8')
  const EOL = source.includes('\r\n') ? '\r\n' : '\n'
  const before = source
  for (const [from, to] of edits) {
    const pattern = Array.isArray(from) ? from.join(EOL) : from
    const replacement = Array.isArray(to) ? to.join(EOL) : to
    if (!source.includes(pattern)) {
      console.error('  ! anchor missing in', file, '→', String(pattern).slice(0, 60))
      continue
    }
    source = source.replace(pattern, replacement)
  }
  if (source !== before) {
    fs.writeFileSync(file, source, 'utf8')
    console.log('  patched', file)
  }
}

patch('src/client/GlobalSearch.tsx', [[
  ['                  <SearchResults',
   "                    query={submitted === '' ? query : submitted}",
   '                  storageScope={GLOBAL_SCOPE}',
   '                    hits={hits}',
   '                    searching={searching}',
   '                    error={error}',
   "                    heading={t('stack.contentHits', { n: String(hits.length) })}",
   '                    onOpenSession={(sessionId, q) => {',
   '                      props.onOpenSession(sessionId, q)',
   '                    }}',
   '                    onFetchContext={(sessionId, seq, text) => fetchSearchContext(sessionId, seq, text)}',
   '                    onFetchSessionHits={(sessionId, text) => fetchSessionHits(sessionId, text)}',
   '                  />'],
  ['                  <SearchResults',
   "                    query={submitted === '' ? query : submitted}",
   '                    hits={hits}',
   "                    heading={t('map.hits', { n: String(hits.length) })}",
   "                    empty={t('map.noHit')}",
   '                    onOpenSession={(sessionId) => { props.onOpenSession(sessionId) }}',
   '                  />'],
]])

patch('src/client/StackDrawer.tsx', [[
  ['                <SearchResults',
   '                  query={query}',
   "                  storageScope={'drawer:' + props.groupId}",
   '                  hits={hits}',
   '                  searching={searching}',
   '                  error={null}',
   "                  heading={t('stack.contentHits', { n: String(hits.length) })}",
   '                  onOpenSession={(sessionId, q) => { props.onOpenSession?.(sessionId, q) }}',
   '                  onFetchContext={props.onFetchContext}',
   '                  onFetchSessionHits={props.onFetchSessionHits}',
   '                />'],
  ['                <SearchResults',
   '                  query={query}',
   '                  hits={hits}',
   "                  heading={t('map.hits', { n: String(hits.length) })}",
   "                  empty={t('map.noHit')}",
   '                  onOpenSession={(sessionId) => { props.onOpenSession?.(sessionId) }}',
   '                />'],
]])

console.log('call sites updated')
