import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
// 用 state 决定是否允许请求，并进入 deps，延迟结束时能真正触发一次
t = t.replace(`  const previewAllowedRef = useRef(false)`, `  const [previewAllowed, setPreviewAllowed] = useState(false)`)
t = t.replace(
  `    const timer = setTimeout(() => {
      previewAllowedRef.current = true
      setPreviews(current => ({ ...current }))
    }, PREVIEW_START_DELAY_MS)`,
  `    const timer = setTimeout(() => { setPreviewAllowed(true) }, PREVIEW_START_DELAY_MS)`,
)
t = t.replace(`    if (!previewAllowedRef.current) return`, `    if (!previewAllowed) return`)
t = t.replace(`  }, [rows, recentRows])`, `  }, [rows, recentRows, previewAllowed])`)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 用 state 触发首次请求')
