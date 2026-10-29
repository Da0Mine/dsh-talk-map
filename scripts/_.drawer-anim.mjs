/** Drawer enters and leaves with a short, smooth animation. */
import fs from 'node:fs'

const file = 'src/client/StackDrawer.tsx'
let source = fs.readFileSync(file, 'utf8')
const J = (lines) => lines.join('\n')

// ---- closing state ----------------------------------------------------
source = source.replace(
  '  const lastScrollAt = useRef(0)',
  J([
    '  const lastScrollAt = useRef(0)',
    '  /** Play the leave animation before the panel is unmounted. */',
    '  const [leaving, setLeaving] = useState(false)',
    '  const leaveTimer = useRef<number | null>(null)',
    '  const requestClose = (): void => {',
    '    if (leaving) return',
    '    setLeaving(true)',
    '    leaveTimer.current = window.setTimeout(() => {',
    '      leaveTimer.current = null',
    '      props.onClose()',
    '    }, 130)',
    '  }',
    '  useEffect(() => () => {',
    '    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current)',
    '  }, [])',
  ]),
)

// ---- every close path goes through requestClose ------------------------
source = source.replace(
  "        if (event.target === event.currentTarget) props.onClose()",
  '        if (event.target === event.currentTarget) requestClose()',
)
source = source.replace(
  "            onClick={props.onClose}\n          >\n            ×",
  "            onClick={requestClose}\n          >\n            ×",
)
source = source.replace(
  "      if (event.key === 'Escape') {\n        event.stopPropagation()\n        props.onClose()",
  "      if (event.key === 'Escape') {\n        event.stopPropagation()\n        requestClose()",
)

// ---- animation classes ------------------------------------------------
source = source.replace(
  "      className={styles['drawerBackdrop']}",
  "      className={`${styles['drawerBackdrop']}${leaving ? ` ${styles['drawerBackdropOut']}` : ''}`}",
)
source = source.replace(
  "      <div className={styles['drawer']} role=\"dialog\" aria-label={props.workspaceTitle}>",
  "      <div\n        className={`${styles['drawer']}${leaving ? ` ${styles['drawerOut']}` : ''}`}\n        role=\"dialog\"\n        aria-label={props.workspaceTitle}\n      >",
)

fs.writeFileSync(file, source, 'utf8')
console.log('drawer: enter/leave animation wired')
