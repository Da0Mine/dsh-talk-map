import fs from 'node:fs'
const f = 'src/client/MapCanvas.tsx'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('claimBatchIntent')) {
  t = t.replace(
    `import { closeMapPanel, currentSessionId, getServices, mapUi, openSessionInUi, uiWorkspaceService } from './map-state.ts'`,
    `import { claimBatchIntent, closeMapPanel, currentSessionId, getServices, mapUi, openSessionInUi, uiWorkspaceService } from './map-state.ts'`,
  )
  t = t.replace(
    `  const [batchMode, setBatchMode] = useState(false)`,
    `  const [batchMode, setBatchMode] = useState(false)
  // A rail can ask for batch mode (right-click → 批量操作) before this panel exists; the intent
  // lands here once the cards are loaded.
  useEffect(() => {
    const intent = claimBatchIntent()
    if (intent === null) return
    const cardId = Object.keys(canvasState.cards).find(id => canvasState.cards[id]?.sessionId === intent)
    if (cardId === undefined) return
    setBatchMode(true)
    setBatchPicks(new Set([cardId]))
  }, [canvasState.cards])`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapCanvas: 消费批量意图')
}
