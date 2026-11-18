/**
 * "Unsent draft" cards in both rails.
 *
 * A card whose conversation holds typed-but-unnot-sent text joins the list at the LOWEST
 * priority: after every lamped card. Cards that already carry a lamp keep their lamp (the
 * draft chip is already shown on them), so nothing is listed twice.
 */
import fs from 'node:fs'

const edits = []

// ── StatusRail: optional lamp + draft marker + ordering + render ───────────
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    `  title: string
  lamp: StatusLamp`,
    `  title: string
  /** Absent for a draft-only card: it has unsent text but no lamp right now. */
  lamp?: StatusLamp`,
  )
  text = text.replace(
    `  preview?: string
  pinned?: boolean
}`,
    `  preview?: string
  pinned?: boolean
  /** Has unsent text (shown as the 待发送 chip when there is no lamp). */
  draft?: boolean
}`,
  )

  // order: lamped first (manual order), draft-only rows appended at the end
  text = text.replace(
    `      const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))
      const rows: StatusRailEntry[] = []
      for (const cardId of order) {
        const entry = byId.get(cardId)
        if (entry !== undefined) rows.push(entry)
      }
      for (const entry of props.entries) {
        if (!order.includes(entry.cardId)) rows.push(entry)
      }
      return rows`,
    `      const byId = new Map(props.entries.map(entry => [entry.cardId, entry]))
      const rows: StatusRailEntry[] = []
      for (const cardId of order) {
        const entry = byId.get(cardId)
        if (entry !== undefined && entry.lamp !== undefined) rows.push(entry)
      }
      for (const entry of props.entries) {
        if (entry.lamp !== undefined && !order.includes(entry.cardId)) rows.push(entry)
      }
      // Draft-only cards always sit at the bottom (lowest priority), newest first.
      const drafts = props.entries
        .filter(entry => entry.lamp === undefined)
        .sort((a, b) => b.stamp - a.stamp)
      return [...rows, ...drafts]`,
  )

  // render: lamp class + chip only when a lamp exists
  text = text.replace(
    "      className={`${styles['card']} ${styles[LAMP_CLASS[entry.lamp]] ?? ''} ${styles['statusRailCard']}${floating ? ` ${",
    "      className={`${styles['card']} ${entry.lamp === undefined ? '' : styles[LAMP_CLASS[entry.lamp]] ?? ''} ${styles['statusRailCard']}${floating ? ` ${",
  )
  text = text.replace(
    `        <span className={\`\${styles['cardChip']} \${styles[LAMP_CHIP[entry.lamp].className]}\`}>
          {LAMP_CHIP[entry.lamp].dot ? <span className={styles['runningDot']} /> : null}
          {t(LAMP_CHIP[entry.lamp].key)}
        </span>`,
    `        {entry.lamp === undefined
          ? <span className={\`\${styles['cardChip']} \${styles['cardChipDraft']}\`}>{t('card.draft')}</span>
          : (
            <span className={\`\${styles['cardChip']} \${styles[LAMP_CHIP[entry.lamp].className]}\`}>
              {LAMP_CHIP[entry.lamp].dot ? <span className={styles['runningDot']} /> : null}
              {t(LAMP_CHIP[entry.lamp].key)}
            </span>
          )}`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail: optional lamp + drafts at the bottom')
}

// ── MapCanvas: append draft-only rows ─────────────────────────────────────
{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')

  const anchor = `      rows.push({
        cardId,
        sessionId: card.sessionId,
        title: renamedTitles[card.sessionId] ?? summary?.displayTitle ?? sessionId,
        lamp,`
  if (!text.includes(anchor)) throw new Error('statusEntries row anchor missing')

  // catch the loop's skip and collect drafts instead
  text = text.replace(
    `      const lamp = glowOf(card.sessionId) as StatusLamp | undefined
      if (lamp === undefined) continue`,
    `      const lamp = glowOf(card.sessionId) as StatusLamp | undefined
      if (lamp === undefined) {
        // Unsent text with no lamp: lowest priority, listed after every lamped card.
        const draftText = draftTexts[card.sessionId]
        if (draftText === undefined || draftText.trim() === '') continue
        const draftSummary = sessions.byId[card.sessionId]
        rows.push({
          cardId,
          sessionId: card.sessionId,
          title: renamedTitles[card.sessionId] ?? draftSummary?.displayTitle ?? sessionId,
          stamp: draftSummary?.updatedAt ?? 0,
          draft: true,
          ...(draftSummary?.updatedAt !== undefined ? { updatedAt: draftSummary.updatedAt } : {}),
          preview: draftText,
          ...(pinnedSessions.has(card.sessionId) ? { pinned: true } : {}),
        })
        continue
      }`,
  )
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapCanvas: draft-only rows')
}

console.log(edits.join('\n'))
