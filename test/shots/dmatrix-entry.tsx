
import React from 'react'
import { createRoot } from 'react-dom/client'
import { StackDrawer } from '../../src/client/StackDrawer.tsx'

const params = new URLSearchParams(location.search)
const count = Number(params.get('cards') ?? 8)
const panelWidth = Number(params.get('width') ?? 900)
const mixed = params.get('mixed') === '1'

const body = [
  '短',
  '这里是一段中等长度的正文，用来把卡片撑到常见的两行高度。',
  '这是一段更长的正文，故意写长一些，让这一张卡片比同排的其他卡片高出两三行，从而把整行的高度推上去，用来检验连线的行间隙是否按真实高度计算。',
]
const items = Array.from({ length: count }, (_, index) => ({
  cardId: 'c' + index,
  sessionId: 's' + index,
  title: '卡片 ' + index,
  preview: body[mixed ? index % body.length : 0],
  updatedAt: Date.now() - index * 3600_000,
}))
const links = []
for (let a = 0; a < count; a += 1) {
  for (let b = 0; b < count; b += 1) {
    if (a === b) continue
    links.push({ from: 'c' + a, to: 'c' + b, visible: true })
  }
}

const style = document.createElement('style')
style.textContent = '[class*="tm_drawerScroll"]{width:' + panelWidth + 'px}'
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  React.createElement(StackDrawer, {
    groupId: 'g', workspaceTitle: 'T', items, links,
    onOpenCard: () => {}, onClose: () => {},
  }),
)
