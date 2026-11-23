/**
 * Rail glass freeze state, kept out of React's canvas render.
 *
 * Setting this from MapCanvas as component state re-rendered the whole board on every pan
 * start/end (measured p95 51 ms with the blur already disabled). A tiny external store means
 * only the rail re-renders, and the thaw is delayed until the canvas is actually still.
 */
import fs from 'node:fs'

const edits = []

// 1) the store
const storePath = 'src/client/rail-glass.ts'
if (!fs.existsSync(storePath)) {
  fs.writeFileSync(storePath, `/** "The canvas is moving" — the rail drops its live blur while this is true. */
let frozen = false
let thawTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function publish(next: boolean): void {
  if (frozen === next) return
  frozen = next
  for (const listener of listeners) listener()
}

export const railGlass = {
  isFrozen(): boolean {
    return frozen
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
  /** Canvas started moving: drop the blur immediately. */
  freeze(): void {
    if (thawTimer !== undefined) {
      clearTimeout(thawTimer)
      thawTimer = undefined
    }
    publish(true)
  },
  /** Canvas stopped: restore the blur once it is actually still. */
  thaw(delayMs = 140): void {
    if (thawTimer !== undefined) clearTimeout(thawTimer)
    thawTimer = setTimeout(() => {
      thawTimer = undefined
      publish(false)
    }, delayMs)
  },
}
`, 'utf8')
  edits.push('rail-glass.ts')
}

// 2) StatusRail reads the store instead of a prop
{
  const file = 'src/client/StatusRail.tsx'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('railGlass')) {
    const importAt = text.split('\n').find(line => line.includes("from './queue-order.ts'") || line.includes('import { t }'))
    const anchorLine = importAt ?? text.split('\n').find(line => line.startsWith('import '))
    if (anchorLine === undefined) throw new Error('import anchor missing')
    text = text.replace(anchorLine, anchorLine + "\nimport { railGlass } from './rail-glass.ts'")

    // 挂进组件：紧跟 open 的读取之后
    const hookAnchor = '  const open = useSyncExternalStore(subscribeOpen'
    if (!text.includes(hookAnchor)) throw new Error('open hook anchor missing')
    text = text.replace(
      hookAnchor,
      "  /** Canvas moving → no live blur (see rail-glass.ts). */\n  const frozen = useSyncExternalStore(railGlass.subscribe, railGlass.isFrozen)\n" + hookAnchor,
    )
    text = text.replace(
      "data-frozen={props.frozen === true ? '1' : '0'}",
      "data-frozen={frozen ? '1' : '0'}",
    )
    // 去掉已不用的 prop 声明
    text = text.replace(/\n  \/\*\* Canvas is moving: drop the live blur for a static fill\. \*\/\n  frozen\?: boolean/, '')
    text = text.replace(/\n  \/\*\* The canvas is moving: drop the live blur for a static fill\. \*\/\n  frozen\?: boolean/, '')
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('StatusRail')
}

// 3) MapCanvas drives it without touching state
{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes('railGlass')) {
    text = text.replace(
      /\n  \/\*\* Canvas panning: the rail's glass degrades for the duration\. \*\/\n  const \[railFrozen, setRailFrozen\] = useState\(false\)/,
      '',
    )
    text = text.replace("        onMoveStart={() => { setRailFrozen(true) }}", '        onMoveStart={() => { railGlass.freeze() }}')
    text = text.replace('          setRailFrozen(false)', '          railGlass.thaw()')
    text = text.replace('        frozen={railFrozen}\n', '')
    const importAt = text.split('\n').find(line => line.includes("from './rail-glass.ts'") === false && line.includes("from './queue-order.ts'"))
    const anchorLine = importAt ?? text.split('\n').find(line => line.startsWith('import '))
    if (anchorLine === undefined) throw new Error('MapCanvas import anchor missing')
    if (!text.includes("from './rail-glass.ts'")) text = text.replace(anchorLine, anchorLine + "\nimport { railGlass } from './rail-glass.ts'")
  }
  fs.writeFileSync(file, text, 'utf8')
  edits.push('MapCanvas')
}

console.log(edits.join(', '))
