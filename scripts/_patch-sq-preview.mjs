import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')

t = t.replace(
  "import { canvas, INBOX_BOARD_ID } from './canvas-store.ts'",
  "import { talkMapApi } from './api.ts'\nimport { canvas, INBOX_BOARD_ID } from './canvas-store.ts'",
)

// 预览缓存 + 批量拉取（只拉前若干张，够填满滚动视口即可）
t = t.replace(
  `  const [drafts, setDrafts] = useState<Record<string, string>>(() => readDraftTexts())`,
  `  const [drafts, setDrafts] = useState<Record<string, string>>(() => readDraftTexts())
  // Card bodies: the user's last message, exactly like the map's rail cards. Fetched in one
  // batch for the visible head of the list; the Host reads a session surface per id, so we
  // never ask for the whole board at once.
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const asked = useRef<Set<string>>(new Set())`,
)
t = t.replace(
  "import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'",
  "import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'",
)

t = t.replace(
  `  const rows = useMemo(() => {`,
  `  useEffect(() => {
    const wanted = rows
      .slice(0, PREVIEW_LIMIT)
      .map(row => row.sessionId)
      .filter(id => !asked.current.has(id))
    if (wanted.length === 0) return
    for (const id of wanted) asked.current.add(id)
    void talkMapApi.lastUserMessages(wanted)
      .then((page) => {
        setPreviews((current) => {
          const next = { ...current }
          for (const [id, text] of Object.entries(page.texts)) {
            if (typeof text === 'string' && text.trim() !== '') next[id] = text
          }
          return next
        })
      })
      .catch(() => { for (const id of wanted) asked.current.delete(id) })
  }, [rows])

  const rowsWithBody = useMemo(() => {`,
)

// rows 定义完之后再算 body
t = t.replace(
  `  if (rows.length === 0) return null`,
  `  if (rowsWithBody.length === 0) return null`,
)
t = t.replace(
  `        <span className={styles['sidebarQueueCount']}>{rows.length}</span>`,
  `        <span className={styles['sidebarQueueCount']}>{rowsWithBody.length}</span>`,
)
t = t.replace(
  `        {rows.map((row) => {
          const draft = row.draft
          const body = draft !== undefined && draft.trim() !== '' ? draft : undefined`,
  `        {rowsWithBody.map((row) => {
          const body = row.body`,
)

// 常量
t = t.replace(
  "const NO_SUBSCRIBE = (): (() => void) => () => {}",
  "/** How many cards get a body preview (the Host reads one session surface each). */\nconst PREVIEW_LIMIT = 14\nconst NO_SUBSCRIBE = (): (() => void) => () => {}",
)
fs.writeFileSync(file, t, 'utf8')
console.log('preview plumbing inserted')
