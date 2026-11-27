import fs from 'node:fs'

// canvas-store: 存标题快照
{
  const f = 'src/client/canvas-store.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('setCardTitle')) {
    t = t.replace(
      `  /** Adopt a card into another workspace's frame (map-level membership). */`,
      `  /**
   * Remember the session title on the card. Purely a cache: it lets a restart paint the rail
   * before the session list hydrates, which is what made titles lag by ten seconds.
   */
  setCardTitle(id: string, title: string): void {
    const card = state.cards[id]
    if (card === undefined || card.title === title) return
    const next = { ...card, title }
    setState({ cards: { ...state.cards, [id]: next } })
    void talkMapApi.upsertCards({ [id]: next }).catch((error) => {
      console.error('[dsh-talk-map] card title save failed:', error)
    })
  },

  /** Adopt a card into another workspace's frame (map-level membership). */`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('canvas-store: setCardTitle')
  }
}

// MapCanvas: 补齐老卡片的标题
{
  const f = 'src/client/MapCanvas.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('titleBackfilled')) {
    t = t.replace(
      `  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({})`,
      `  /** Cards from an older build have no title snapshot: fill them in once the list is up. */
  const titleBackfilled = useRef(new Set<string>())
  useEffect(() => {
    for (const [cardId, card] of Object.entries(canvasState.cards)) {
      if (card.title !== undefined) continue
      const title = sessions.byId[card.sessionId]?.displayTitle
      if (title === undefined || title === '') continue
      if (titleBackfilled.current.has(cardId)) continue
      titleBackfilled.current.add(cardId)
      canvas.setCardTitle(cardId, title)
    }
  }, [canvasState.cards, sessions, canvas])

  const [renamedTitles, setRenamedTitles] = useState<Record<string, string>>({})`,
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('MapCanvas: 标题回填')
  }
}
