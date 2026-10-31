import { createRoot } from 'react-dom/client'
import { ReactFlow, ReactFlowProvider, Background, Handle, Position, ConnectionMode } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { edgeTypes } from '../src/client/TalkMapEdge.tsx'
import { pickFaces } from '../src/client/edge-routing.ts'

const CARD_W = 224
const CARD_H = 120
const card = (id, x, y, label) => ({ id, position: { x, y }, data: { label },
  style: { width: CARD_W, height: CARD_H, background: '#23262d', color: '#cfd6e3', border: '1px solid #333a45', borderRadius: 10 } })

// The map's cards expose four handles named t/r/b/l; the rig must too, otherwise
// an edge that asks for handle 'r' cannot be drawn at all.
const nodeTypes = {
  card: ({ data }) => (
    <div style={{ width: CARD_W, height: CARD_H, background: '#23262d', color: '#cfd6e3',
      border: '1px solid #333a45', borderRadius: 10, display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <Handle id="t" type="source" position={Position.Top} />
      <Handle id="r" type="source" position={Position.Right} />
      <Handle id="b" type="source" position={Position.Bottom} />
      <Handle id="l" type="source" position={Position.Left} />
      {data.label}
    </div>
  ),
}

// b: far to the right-down (long line) — c/d: neighbours 12px apart (the stub case)
const nodes = [
  { ...card('a', 40, 30, 'A'), type: 'card' },
  { ...card('b', 520, 210, 'B'), type: 'card' },
  { ...card('c', 40, 290, 'C'), type: 'card' },
  { ...card('d', 40 + CARD_W + 12, 290, 'D'), type: 'card' },
]

const placed = nodes.map(node => ({ id: node.id, x: node.position.x, y: node.position.y }))
const faceFor = (fromId, toId) => {
  const from = placed.find(node => node.id === fromId)
  const to = placed.find(node => node.id === toId)
  const faces = pickFaces(from, to, placed, { cardWidth: CARD_W, cardHeight: CARD_H })
  return { sourceHandle: faces.fromHandle, targetHandle: faces.toHandle }
}

const edges = [
  { id: 'sync', source: 'a', target: 'b', type: 'talkMap', data: { sync: 'synced' }, ...faceFor('a', 'b') },
  { id: 'idle', source: 'b', target: 'a', type: 'talkMap', data: { sync: 'idle' }, ...faceFor('b', 'a') },
  { id: 'adjacent', source: 'c', target: 'd', type: 'talkMap', data: { sync: 'synced' }, ...faceFor('c', 'd') },
]

createRoot(document.getElementById('root')!).render(
  <div style={{ width: 820, height: 560 }}>
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} nodeTypes={nodeTypes} connectionMode={ConnectionMode.Loose} fitView proOptions={{ hideAttribution: true }}>
        <Background />
      </ReactFlow>
    </ReactFlowProvider>
  </div>,
)
