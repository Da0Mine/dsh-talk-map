/**
 * demo 数据布局修正：加高框架（2 行）、错开新卡坐标、补一条可见的演示连线。
 */
import fs from 'node:fs'

const file = 'test/harness.js'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

// 1) 框架加高 + 演示卡放到空槽
const old = [
  '    // Cards for the new sessions: initial coordinates sit inside the frame;',
  '    // the folder layout re-slots them when the board opens.',
  '    const demoAdd = (sessionId, rect, row = 0) => {',
  '      cards[`card-${++counter}`] = {',
  "        boardId: 'inbox',",
  '        sessionId,',
  '        x: rect.x + PAD,',
  '        y: rect.y + PAD + LABEL + row * (CARD_H + GAP_Y),',
  '        createdAt: T0,',
  '      }',
  '    }',
  `    demoAdd('s11', frames['ws-daily'], 0)`,
  `    demoAdd('s12', frames['ws-daily'], 0)`,
  `    demoAdd('s13', frames['ws-daily'], 0)`,
  `    demoAdd('s14', frames['ws-medkit'], 0)`,
  `    demoAdd('s15', frames['ws-medkit'], 0)`,
  `    demoAdd('s16', frames['ws-lab'], 0)`,
].join(D)
const next = [
  '    // Frames grow a row so the showcase cards have real slots (the fold',
  '    // stack still appears where cards genuinely overflow).',
  `    const grow = (id, extra) => { frames[id].height += extra * (CARD_H + GAP_Y) }`,
  `    grow('ws-daily', 1)`,
  `    grow('ws-medkit', 1)`,
  `    grow('ws-lab', 1)`,
  '    // Place each demo card in a free slot: frame grid is cols-wide, row-major.',
  '    const demoAdd = (sessionId, wsId, col, row) => {',
  '      const rect = frames[wsId]',
  '      cards[`card-${++counter}`] = {',
  "        boardId: 'inbox',",
  '        sessionId,',
  '        x: rect.x + PAD + col * (CARD_W + GAP_X),',
  '        y: rect.y + PAD + LABEL + row * (CARD_H + GAP_Y),',
  '        createdAt: T0,',
  '      }',
  '    }',
  `    demoAdd('s11', 'ws-daily', 0, 1)`,
  `    demoAdd('s12', 'ws-daily', 1, 1)`,
  `    demoAdd('s13', 'ws-daily', 2, 1)`,
  `    demoAdd('s14', 'ws-medkit', 0, 1)`,
  `    demoAdd('s15', 'ws-medkit', 1, 1)`,
  `    demoAdd('s16', 'ws-lab', 0, 1)`,
  '    // One stored edge between two visible cards so the dashed line shows;',
  '    // never pushed → not synced → the line is visible (and the fork line',
  '    // between s11 and s12 renders through the derived lineage rule).',
  `    cards['card-demo-a'] = undefined`,
  '    delete cards[\'card-demo-a\']',
  "    const demoFrom = Object.entries(cards).find(([, card]) => card?.sessionId === 's13')",
  "    const demoTo = Object.entries(cards).find(([, card]) => card?.sessionId === 's11')",
  '    if (demoFrom !== undefined && demoTo !== undefined) {',
  '      edges[`edge-demo-${demoFrom[0]}-${demoTo[0]}`] = {',
  "        boardId: 'inbox',",
  '        fromCardId: demoFrom[0],',
  '        toCardId: demoTo[0],',
  '        injection: { kind: \'digest\', autoPush: false },',
  '      }',
  '    }',
].join(D)

if (!source.includes(old)) {
  console.error('demoAdd block anchor missing')
  process.exit(1)
}
source = source.replace(old, next)

// 2) demo 模式下 daily 框架允许 2 行
source = source.replace(
  `    grow('ws-daily', 1)`,
  [
    `    grow('ws-daily', 1)`,
    `    FRAME_SHAPE['ws-daily'] = { cols: 3, rows: 2 }`,
    `    FRAME_SHAPE['ws-medkit'] = { cols: 2, rows: 2 }`,
    `    FRAME_SHAPE['ws-lab'] = { cols: 1, rows: 2 }`,
  ].join(D),
)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('demo layout fixed')
