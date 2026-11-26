import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
// renderCard 支持自定义 onClick
t = t.replace(
  `    interactive = true,
    pointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void,
  ): React.JSX.Element => (`,
  `    interactive = true,
    pointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void,
    onClick?: () => void,
  ): React.JSX.Element => (`,
)
t = t.replace(
  `      {...(interactive ? {} : { onClick: () => { props.onOpen(entry.cardId) } })}`,
  `      {...(interactive ? {} : { onClick: onClick ?? (() => { props.onOpen(entry.cardId) }) })}`,
)
// 最近卡：点击前先问拖拽守卫
t = t.replace(
  `                      {renderCard(entry, false, false, event => { recentDrag.begin(event, entry.cardId) })}`,
  `                      {renderCard(
                        entry,
                        false,
                        false,
                        event => { recentDrag.begin(event, entry.cardId) },
                        () => { if (!recentDrag.shouldIgnoreClick()) props.onOpen(entry.cardId) },
                      )}`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('StatusRail: 拖拽后抑制点击')
