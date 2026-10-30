/** A local push must repaint the edges: lineage lines have no stored edge to bump. */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// 1. a counter that the edge memo depends on
source = source.replace(
  J(['  const [digestTarget, setDigestTarget] = useState<{ title: string; digest: Digest | undefined } | null>(null)']),
  J([
    '  const [digestTarget, setDigestTarget] = useState<{ title: string; digest: Digest | undefined } | null>(null)',
    '  /** Bumped after a push: edges recompute their sync state (lineage has no edge row). */',
    '  const [pushEpoch, setPushEpoch] = useState(0)',
  ]),
)

// 2. bump it after a successful push
source = source.replace(
  '      const pushedAt = stampPush(fromCardId, toCardId)',
  J([
    '      const pushedAt = stampPush(fromCardId, toCardId)',
    '      setPushEpoch(previous => previous + 1)',
  ]),
)

// 3. depend on it
source = source.replace(
  '  }, [visibleCards, canvasState.edges, sessions, sessionIdToCardId, liveSelectedEdgeIds, foldedSet, locale])',
  '  }, [visibleCards, canvasState.edges, sessions, sessionIdToCardId, liveSelectedEdgeIds, foldedSet, locale, pushEpoch])',
)

fs.writeFileSync(file, source, 'utf8')
console.log('push epoch wired')
