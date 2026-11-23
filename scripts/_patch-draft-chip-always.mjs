/**
 * A card that is running (or waiting / unread) AND has unsent text showed only its status
 * chip: the 待发送 chip was reserved for draft-only rows. Show both, draft first.
 */
import fs from 'node:fs'

const edits = []

// ── 1. StatusRail: render the draft chip alongside the lamp chip ───────────
{
  const file = 'src/client/StatusRail.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const at = lines.findIndex(l => l.includes("cardTime']}>{relativeTime(entry.updatedAt)}"))
  if (at < 0) throw new Error('rail footer not found')
  const indent = lines[at].match(/^\s*/)[0]
  let end = at
  while (end < lines.length && lines[end].trim() !== ')}') end += 1
  if (end >= lines.length) throw new Error('rail footer end not found')
  lines.splice(at + 1, end - at,
    ...[
      '        {/* Unsent text is independent of the lamp: show it next to the status chip. */}',
      '        {entry.draft === true',
      '          ? <span className={`${styles[\'cardChip\']} ${styles[\'cardChipDraft\']}`}>{t(\'card.draft\')}</span>',
      '          : null}',
      '        {entry.lamp === undefined',
      '          ? null',
      '          : (',
      '            <span className={`${styles[\'cardChip\']} ${styles[LAMP_CHIP[entry.lamp].className]}`}>',
      '              {LAMP_CHIP[entry.lamp].dot ? <span className={styles[\'runningDot\']} /> : null}',
      '              {t(LAMP_CHIP[entry.lamp].key)}',
      '            </span>',
      '          )}',
    ].map(line => indent + line),
  )
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  edits.push('StatusRail chip')
}

// ── 2. SidebarQueue: same ─────────────────────────────────────────────────
{
  const file = 'src/client/SidebarQueue.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const at = lines.findIndex(l => l.includes("cardTime']}>{relativeTime(row.updatedAt)}"))
  if (at < 0) throw new Error('sidebar footer not found')
  const indent = lines[at].match(/^\s*/)[0]
  let end = at
  while (end < lines.length && lines[end].trim() !== ')}') end += 1
  if (end >= lines.length) throw new Error('sidebar footer end not found')
  lines.splice(at + 1, end - at,
    ...[
      '                {/* Draft first, then the status chip: they can both be true. */}',
      '                {row.draft === true',
      '                  ? <span className={`${styles[\'cardChip\']} ${styles[\'cardChipDraft\']}`}>{t(\'card.draft\')}</span>',
      '                  : null}',
      '                {row.lamp === undefined',
      '                  ? null',
      '                  : (',
      '                    <span className={`${styles[\'cardChip\']} ${styles[LAMP_CHIP[row.lamp].className]}`}>',
      '                      {LAMP_CHIP[row.lamp].dot ? <span className={styles[\'runningDot\']} /> : null}',
      '                      {t(LAMP_CHIP[row.lamp].key)}',
      '                    </span>',
      '                  )}',
    ].map(line => indent + line),
  )
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  edits.push('SidebarQueue chip')
}

// ── 3. rows/entries must carry `draft` even when a lamp is present ────────
{
  const file = 'src/client/SidebarQueue.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "      ...(draftOnly ? { draft: true } : { lamp }),",
    "      ...(draftOnly ? { draft: true } : { lamp }),\n      ...(hasDraft ? { draft: true } : {}),",
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('sidebar rows draft flag')
}

{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')
  const before = `        title: renamedTitles[card.sessionId] ?? summary?.displayTitle ?? sessionId,
        lamp,`
  const after = `        title: renamedTitles[card.sessionId] ?? summary?.displayTitle ?? sessionId,
        lamp,
        // A lamped card can still hold unsent text; the chip row shows both.
        ...((draftTexts[card.sessionId] ?? '').trim() !== '' ? { draft: true } : {}),`
  if (!text.includes(before)) throw new Error('rail entry anchor missing')
  text = text.replace(before, after)
  fs.writeFileSync(file, text, 'utf8')
  edits.push('rail entry draft flag')
}

console.log(edits.join('\n'))
