import fs from 'node:fs'
const edits = []
// 1) CSS：删掉 data-frozen 规则
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  const at = t.indexOf('/* Panning: same colour, no live sampling')
  if (at >= 0) t = t.slice(0, at).trimEnd() + '\n'
  // 兼容旧写法（若有）
  t = t.replace(/\n\.statusRail\[data-frozen="1"\] \.statusRailPanel \{[\s\S]*?\n\}\n?/g, '\n')
  fs.writeFileSync(f, t, 'utf8')
  edits.push('css')
}
// 2) StatusRail：去掉 frozen 订阅与属性
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace("import { railGlass } from './rail-glass.ts'\n", '')
  t = t.replace(/  \/\*\* Canvas moving[^\n]*\n  const frozen = useSyncExternalStore\(railGlass\.subscribe, railGlass\.isFrozen\)\n/, '')
  t = t.replace(/\n  \/\*\* Canvas moving[^\n]*\n  const frozen = useSyncExternalStore\(railGlass\.subscribe, railGlass\.isFrozen\)/, '')
  t = t.replace("      data-frozen={frozen ? '1' : '0'}\n", '')
  fs.writeFileSync(f, t, 'utf8')
  edits.push('StatusRail')
}
// 3) MapCanvas：去掉 freeze/thaw 调用与 import
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace("import { railGlass } from './rail-glass.ts'\n", '')
  t = t.replace("        onMoveStart={() => { railGlass.freeze() }}\n", '')
  t = t.replace('          railGlass.thaw()\n', '')
  fs.writeFileSync(f, t, 'utf8')
  edits.push('MapCanvas')
}
console.log(edits.join(', '))
