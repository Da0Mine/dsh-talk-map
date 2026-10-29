/** Batch 1: spawn modes (full by default), capacity-1 stacking, edge arrows. */
import fs from 'node:fs'
const J = (lines) => lines.join('\n')

// ---- 1. SpawnPreview: drop the "no inheritance" mode, default = full -----
let spawn = fs.readFileSync('src/client/SpawnPreview.tsx', 'utf8')
spawn = spawn.replace(
  "type SpawnMode = 'none' | 'digest' | 'full'",
  "type SpawnMode = 'digest' | 'full'",
)
spawn = spawn.replace(
  "  const [mode, setMode] = useState<SpawnMode>('digest')",
  "  // Full history is the default: dropping a connection on empty canvas means\n  // \"continue this conversation over there\".\n  const [mode, setMode] = useState<SpawnMode>('full')",
)
spawn = spawn.replace(
  J([
    '  const modes: { id: SpawnMode; label: string }[] = [',
    "    { id: 'none', label: t('spawn.mode.none') },",
    "    { id: 'digest', label: t('spawn.mode.digest') },",
    "    { id: 'full', label: t('spawn.mode.full') },",
    '  ]',
  ]),
  J([
    '  const modes: { id: SpawnMode; label: string }[] = [',
    "    { id: 'digest', label: t('spawn.mode.digest') },",
    "    { id: 'full', label: t('spawn.mode.full') },",
    '  ]',
  ]),
)
fs.writeFileSync('src/client/SpawnPreview.tsx', spawn, 'utf8')

// ---- 2. capacity 1 → the single slot IS the stack cell -------------------
let layout = fs.readFileSync('src/client/grid-layout.ts', 'utf8')
layout = layout.replace(
  J([
    'export function visibleCount(capacity: number, total: number): number {',
    '  if (total <= capacity) return total',
    "  // One slot is spent on the stack cell, so the grid shows one card fewer.",
    '  return Math.max(1, capacity - 1)',
    '}',
  ]),
  J([
    'export function visibleCount(capacity: number, total: number): number {',
    '  if (total <= capacity) return total',
    '  // One slot is spent on the stack cell, so the grid shows one card fewer —',
    '  // and when the folder only fits ONE card, that slot is the stack itself',
    '  // (otherwise the second card would spill outside the frame).',
    '  return Math.max(0, capacity - 1)',
    '}',
  ]),
)
fs.writeFileSync('src/client/grid-layout.ts', layout, 'utf8')

console.log('spawn modes + capacity rule updated')
