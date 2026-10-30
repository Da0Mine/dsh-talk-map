import { createRoot } from 'react-dom/client'
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import { edgeTypes } from '../src/client/TalkMapEdge.tsx'
import '@xyflow/react/dist/style.css'

const nodes = [
  { id: 'a', position: { x: 60, y: 60 }, data: { label: 'A' }, style: { width: 130, height: 64, background: '#23262d', color: '#cfd6e3', border: '1px solid #333a45', borderRadius: 10 } },
  { id: 'b', position: { x: 460, y: 220 }, data: { label: 'B' }, style: { width: 130, height: 64, background: '#23262d', color: '#cfd6e3', border: '1px solid #333a45', borderRadius: 10 } },
]

const edges = [
  { id: 'sync', source: 'a', target: 'b', type: 'talkMap', data: { sync: 'synced' } },
  { id: 'idle', source: 'b', target: 'a', type: 'talkMap', data: { sync: 'idle' } },
]

createRoot(document.getElementById('root')!).render(
  <div style={{ width: 760, height: 420 }}>
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} fitView proOptions={{ hideAttribution: true }}>
        <Background />
      </ReactFlow>
    </ReactFlowProvider>
  </div>,
)
