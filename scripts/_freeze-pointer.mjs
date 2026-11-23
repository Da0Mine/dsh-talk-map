import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('pointerdown')) {
  const anchor = '  const [order, setOrder] = useState<string[]>(() => readOrder())'
  t = t.replace(anchor, `  // Deterministic freeze: React Flow's move callbacks did not fire reliably for a
  // middle-button pan, so pointer down/up on the window drives the state instead.
  useEffect(() => {
    const onDown = (): void => { railFrozen.freeze() }
    const onUp = (): void => { railFrozen.thaw() }
    window.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('pointerup', onUp, { capture: true })
    window.addEventListener('pointercancel', onUp, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true })
      window.removeEventListener('pointerup', onUp, { capture: true })
      window.removeEventListener('pointercancel', onUp, { capture: true })
    }
  }, [])

` + anchor)
}
fs.writeFileSync(f, t, 'utf8')
console.log('StatusRail: 指针驱动冻结')
