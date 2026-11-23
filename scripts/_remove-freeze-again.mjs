import fs from 'node:fs'
const edits = []
// 1) StatusRail：删掉 frozen 状态、指针监听、data-frozen
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace("import { railFrozen } from './rail-frozen.ts'\n", '')
  t = t.replace("  const frozen = useSyncExternalStore(railFrozen.subscribe, railFrozen.isFrozen)\n", '')
  t = t.replace("      data-frozen={frozen ? '1' : '0'}\n", '')
  // 指针驱动的冻结 effect
  const start = t.indexOf('  // Deterministic freeze:')
  if (start >= 0) {
    const end = t.indexOf('  }, [])', t.indexOf('window.addEventListener', start)) + '  }, [])'.length
    t = t.slice(0, start) + t.slice(end + 1)
  }
  fs.writeFileSync(f, t, 'utf8')
  edits.push('StatusRail')
}
// 2) MapCanvas：删掉 freeze/thaw
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace("import { railFrozen } from './rail-frozen.ts'\n", '')
  t = t.replace("        onMoveStart={() => { railFrozen.freeze() }}\n", '')
  t = t.replace('          railFrozen.thaw()\n', '')
  fs.writeFileSync(f, t, 'utf8')
  edits.push('MapCanvas')
}
// 3) CSS：删掉 data-frozen 块
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  const at = t.indexOf('/* Panning: the displacement filter re-samples')
  if (at >= 0) t = t.slice(0, at).trimEnd() + '\n'
  fs.writeFileSync(f, t, 'utf8')
  edits.push('CSS')
}
console.log(edits.join(', '))
