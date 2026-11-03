import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) icon C: two bars + two dots
text = text.replace(
  `        <svg viewBox="0 0 12 24" width="13" height="26" aria-hidden="true">
          <rect x="1.4" y="1" width="2" height="22" rx="1" fill="currentColor" />
          <rect x="8.6" y="1" width="2" height="22" rx="1" fill="currentColor" />
        </svg>`,
  `        <svg viewBox="0 0 12 28" width="14" height="30" aria-hidden="true">
          <rect x="1.4" y="1" width="2" height="20" rx="1" fill="currentColor" />
          <rect x="8.6" y="1" width="2" height="20" rx="1" fill="currentColor" />
          <circle cx="2.4" cy="25" r="1.5" fill="currentColor" />
          <circle cx="9.6" cy="25" r="1.5" fill="currentColor" />
        </svg>`,
)

// 2) FLIP via React state (imperative styles were being dropped on re-render, which is why
// the other cards did not visibly make room).
text = text.replace(
  "  const prevTops = useRef(new Map<string, number>())",
  "  const prevTops = useRef(new Map<string, number>())\n  const [shift, setShift] = useState<Record<string, number>>({})",
)

const oldFlip = text.slice(text.indexOf('  // FLIP: after any reorder'), text.indexOf('  // Pointer-driven drag'))
if (oldFlip === '') { console.log('flip block not found'); process.exit(1) }
const newFlip = `  // FLIP: after a reorder, each card that moved is painted first at its old offset and
  // then animated to its new place — so the rest of the column visibly makes room while
  // you drag. The offsets live in React state so a re-render cannot drop them.
  useLayoutEffect(() => {
    const next = new Map<string, number>()
    const deltas: Record<string, number> = {}
    for (const [cardId, element] of slotsRef.current) {
      const top = element.getBoundingClientRect().top
      next.set(cardId, top)
      if (drag !== null && drag.cardId === cardId) continue
      const before = prevTops.current.get(cardId)
      if (before === undefined || Math.abs(before - top) < 1) continue
      deltas[cardId] = before - top
    }
    prevTops.current = next
    const ids = Object.keys(deltas)
    if (ids.length === 0) return
    setShift(deltas)
    const frame = requestAnimationFrame(() => { setShift({}) })
    return () => { cancelAnimationFrame(frame) }
  }, [order, drag === null])

`
text = text.replace(oldFlip, newFlip)

// 3) render the offset
text = text.replace(
  `                style={floating
                  ? {
                      position: 'fixed',
                      left: drag.left,
                      width: drag.width,
                      top: drag.baseTop + (drag.pointerY - drag.startPointerY),
                      zIndex: 20,
                    }
                  : undefined}`,
  `                style={floating
                  ? {
                      position: 'fixed',
                      left: drag.left,
                      width: drag.width,
                      top: drag.baseTop + (drag.pointerY - drag.startPointerY),
                      zIndex: 20,
                    }
                  : shift[entry.cardId] !== undefined
                    ? { transform: \`translateY(\${shift[entry.cardId]}px)\`, transition: 'none' }
                    : { transition: \`transform \${FLIP_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)\` }}`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('icon C + state-driven FLIP')
