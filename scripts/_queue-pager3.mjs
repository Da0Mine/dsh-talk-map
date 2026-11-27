import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 列表改用可见集
const before = `              {recentRowsOrdered.map((row) => (`
if (!t.includes(before)) throw new Error('render line missing')
t = t.replace(before, `              {visibleRecentRows.map((row) => (`)

// 2) 在 `))}` 之后、`</>` 之前插入按钮
const tail = `              ))}
            </>
          )
          : null}`
const withButton = `              ))}
              {hasMoreRecent
                ? (
                    <button
                      type="button"
                      className={styles['sidebarQueueMore']}
                      onClick={() => { setRecentLimit(current => current + RECENT_PAGE_SIZE) }}
                    >
                      {t('statusRail.more')}
                    </button>
                  )
                : null}
            </>
          )
          : null}`
if (!t.includes(tail)) throw new Error('recent block tail missing')
t = t.replace(tail, withButton)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 可见列表 + 查看更多')
