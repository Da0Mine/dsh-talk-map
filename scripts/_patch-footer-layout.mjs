/** Wide sidebar: the footer becomes a column (queue on top, the two buttons pinned below). */
import fs from 'node:fs'

// ── 1. markup: put the two buttons in their own row ────────────────────────
{
  const file = 'src/client/MapToggleButton.tsx'
  let text = fs.readFileSync(file, 'utf8')
  const before = `      {wide ? <SidebarQueue /> : null}
      <button
        type="button"
        className={classNames.filter(Boolean).join(' ')}`
  const after = `      {wide ? <SidebarQueue /> : null}
      {/* The two original controls keep their own row, so a long queue can never push
          them off the bottom of the sidebar. */}
      <div className={styles['toggleControls']}>
      <button
        type="button"
        className={classNames.filter(Boolean).join(' ')}`
  if (!text.includes(before)) throw new Error('button start anchor missing')
  text = text.replace(before, after)

  const tail = `        <BackIcon />
      </button>
    </div>
  )
}`
  const tailAfter = `        <BackIcon />
      </button>
      </div>
    </div>
  )
}`
  if (!text.includes(tail)) throw new Error('button end anchor missing')
  text = text.replace(tail, tailAfter)
  fs.writeFileSync(file, text, 'utf8')
  console.log('MapToggleButton: controls wrapped in .toggleControls')
}

// ── 2. CSS: column when wide, controls pinned, queue capped ────────────────
{
  const file = 'src/client/talk-map.module.css'
  let sheet = fs.readFileSync(file, 'utf8')
  const before = `.toggleWrapWide {
  width: 100%;
}`
  const after = `.toggleWrapWide {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  min-height: 0;
}

/* The queue may grow and scroll, but this row never shrinks: the map button and the
   back-to-current button stay visible no matter how many sessions are on the board. */
.toggleControls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}`
  if (!sheet.includes(before)) throw new Error('toggleWrapWide anchor missing')
  sheet = sheet.replace(before, after)
  fs.writeFileSync(file, sheet, 'utf8')
  console.log('css: toggleWrapWide column + toggleControls row')
}
