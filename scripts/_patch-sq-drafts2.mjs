import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

// body：草稿文本优先，其次上一条消息
t = t.replace(
  `          const draft = row.draft
          const body = draft !== undefined && draft.trim() !== ''
            ? draft
            : previews[row.sessionId]
          const chip = LAMP_CHIP[row.lamp]`,
  `          // Unsent text wins (it is what the card is about), otherwise the last message.
          const draftText = row.draftText
          const body = draftText !== undefined && draftText.trim() !== ''
            ? draftText
            : previews[row.sessionId]
          const chip = row.lamp === undefined ? undefined : LAMP_CHIP[row.lamp]`,
)

// 类名：没有灯就不加灯的样式
t = t.replace(
  "className={`${styles['card']} ${styles[LAMP_CLASS[row.lamp]] ?? ''} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}",
  "className={`${styles['card']} ${row.lamp === undefined ? '' : styles[LAMP_CLASS[row.lamp]] ?? ''} ${styles['statusRailCard']} ${styles['sidebarQueueCard']}`}",
)
t = t.replace("data-lamp={row.lamp}", "data-lamp={row.lamp ?? 'draft'}")

// 胶囊：有灯用灯的，没灯显示「待发送」
t = t.replace(
  `                <span className={\`\${styles['cardChip']} \${styles[chip.className]}\`}>
                  {chip.dot === true ? <span className={styles['runningDot']} /> : null}
                  {t(chip.key)}
                </span>`,
  `                {chip === undefined
                  ? <span className={\`\${styles['cardChip']} \${styles['cardChipDraft']}\`}>{t('card.draft')}</span>
                  : (
                    <span className={\`\${styles['cardChip']} \${styles[chip.className]}\`}>
                      {chip.dot === true ? <span className={styles['runningDot']} /> : null}
                      {t(chip.key)}
                    </span>
                  )}`,
)
fs.writeFileSync(file, t, 'utf8')
console.log('sidebar render: draft cards')
