/** MapCanvas: 查看摘要 menu entry + the dialog (EOL-aware). */
import fs from 'node:fs'

const file = 'src/client/MapCanvas.tsx'
let source = fs.readFileSync(file, 'utf8')
const EOL = source.includes('\r\n') ? '\r\n' : '\n'
const J = (lines) => lines.join(EOL)

// imports
source = source.replace(
  "import { buildPushText, digestIsEmpty } from './digest-text.ts'",
  "import { buildPushText, digestIsEmpty } from './digest-text.ts'" + EOL + "import { DigestDialog } from './DigestDialog.tsx'",
)
source = source.replace(
  "import type { Card, FrameGeometry } from '../shared/model.ts'",
  "import type { Card, Digest, FrameGeometry } from '../shared/model.ts'",
)

// state next to renameTarget
source = source.replace(
  '  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(',
  J([
    '  /** Card whose digest is being inspected (read-only). */',
    '  const [digestTarget, setDigestTarget] = useState<{ title: string; digest: Digest | undefined } | null>(null)',
    '  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(',
  ]),
)

const menuAnchor = J([
  '      items.push({',
  "        key: 'rename',",
  "        icon: 'rename',",
  "        label: t('menu.rename'),",
])
if (!source.includes(menuAnchor)) {
  console.error('menu anchor missing')
  process.exit(1)
}
source = source.replace(
  menuAnchor,
  J([
    '      // Read-only: exactly the text this card would push to another session.',
    '      items.push({',
    "        key: 'view-digest',",
    "        icon: 'digest',",
    "        label: t('menu.viewDigest'),",
    '        ...(card === undefined || digestIsEmpty(canvasState.digests[card.sessionId])',
    "          ? { hint: t('digest.empty'), disabled: true }",
    '          : {}),',
    '        onPick: () => {',
    '          close()',
    '          if (card === undefined) return',
    '          setDigestTarget({',
    '            title: renamedTitles[card.sessionId] ?? sessions.byId[card.sessionId]?.displayTitle ?? card.sessionId,',
    '            digest: canvasState.digests[card.sessionId],',
    '          })',
    '        },',
    '      })',
    '',
    menuAnchor,
  ]),
)

const renderAnchor = J(['      {renameTarget !== null'])
if (!source.includes(renderAnchor)) {
  console.error('render anchor missing')
  process.exit(1)
}
source = source.replace(
  renderAnchor,
  J([
    '      {digestTarget !== null',
    '        ? (',
    '            <DigestDialog',
    '              title={digestTarget.title}',
    '              digest={digestTarget.digest}',
    '              onClose={() => { setDigestTarget(null) }}',
    '            />',
    '          )',
    '        : null}',
    renderAnchor,
    '',
  ]),
)

fs.writeFileSync(file, source, 'utf8')
console.log('menu + dialog wired (EOL: ' + JSON.stringify(EOL) + ')')
