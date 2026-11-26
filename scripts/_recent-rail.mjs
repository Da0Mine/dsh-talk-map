import fs from 'node:fs'

// ---------- StatusRail：最近的任务区 + 瞄准镜 ----------
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')

  t = t.replace(
    `  /** Single click: open that conversation. */
  onOpen: (cardId: string) => void
}`,
    `  /** Single click: open that conversation. */
  onOpen: (cardId: string) => void
  /** Cards with no lamp and no draft, newest first — the「最近的任务」section at the bottom. */
  recent?: readonly StatusRailEntry[]
  /** The conversation on screen right now: it gets the corner brackets. */
  currentSessionId?: string
}`,
  )

  t = t.replace(
    `  const renderCard = (entry: StatusRailEntry, floating: boolean): React.JSX.Element => (
    <div
      className={\`\${styles['card']} \${entry.lamp === undefined ? '' : styles[LAMP_CLASS[entry.lamp]] ?? ''} \${styles['statusRailCard']}\${floating ? \` \${styles['statusRailCardDragging']}\` : ''}\`}
      onPointerDown={floating ? undefined : (event) => { beginDrag(event, entry.cardId) }}
      title={entry.title}
    >`,
    `  const renderCard = (entry: StatusRailEntry, floating: boolean, interactive = true): React.JSX.Element => (
    <div
      className={\`\${styles['card']} \${entry.lamp === undefined ? '' : styles[LAMP_CLASS[entry.lamp]] ?? ''} \${styles['statusRailCard']}\${floating ? \` \${styles['statusRailCardDragging']}\` : ''}\`}
      onPointerDown={floating || !interactive ? undefined : (event) => { beginDrag(event, entry.cardId) }}
      {...(interactive ? {} : { onClick: () => { props.onOpen(entry.cardId) } })}
      title={entry.title}
    >
      {props.currentSessionId !== undefined && entry.sessionId === props.currentSessionId
        ? <span className={styles['cardReticle']} aria-hidden="true"><i /><i /><i /><i /></span>
        : null}`,
  )

  t = t.replace(
    `          })}
        </div>
      </div>`,
    `          })}
          {props.recent !== undefined && props.recent.length > 0
            ? (
              <>
                <div className={styles['statusRailRecentHead']}>{t('statusRail.recent')}</div>
                {props.recent.map(entry => (
                  <div key={entry.cardId} className={styles['statusRailSlot']}>
                    {renderCard(entry, false, false)}
                  </div>
                ))}
              </>
            )
            : null}
        </div>
      </div>`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: recent 区 + reticle')
}

// ---------- i18n ----------
{
  const f = 'src/client/i18n.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(`'statusRail.empty': '暂时没有带状态的卡片',`, `'statusRail.empty': '暂时没有带状态的卡片',\n  'statusRail.recent': '最近的任务',`)
  t = t.replace(`'statusRail.empty': 'No card carries a status right now',`, `'statusRail.empty': 'No card carries a status right now',\n  'statusRail.recent': 'Recent tasks',`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('i18n: statusRail.recent')
}
