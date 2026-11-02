
import React from 'react'
import { createRoot } from 'react-dom/client'
import { StackDrawer } from '../../src/client/StackDrawer.tsx'

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const items = ids.map((id, index) => ({
  cardId: 'card-' + id,
  sessionId: 'sess-' + id,
  title: '卡片 ' + id.toUpperCase(),
  preview: '这里是一段正文，用来把卡片撑到正常高度。',
  updatedAt: Date.now() - index * 3600_000,
}))
// Top-row cards wired through their top faces (the reported case), plus a long link.
const links = [
  { from: 'card-a', to: 'card-e', visible: true },
  { from: 'card-a', to: 'card-f', visible: true },
  { from: 'card-a', to: 'card-g', visible: true },
  { from: 'card-b', to: 'card-h', visible: true },
  { from: 'card-d', to: 'card-e', visible: true },
  { from: 'card-a', to: 'card-h', visible: true },
  { from: 'card-c', to: 'card-d', visible: true },
]

createRoot(document.getElementById('root')).render(
  React.createElement(StackDrawer, {
    groupId: 'g',
    workspaceTitle: '抽屉',
    items,
    links,
    onOpenCard: () => {},
    onClose: () => {},
  }),
)
