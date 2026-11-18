import fs from 'node:fs'
const file = 'src/client/talk-map.module.css'
let s = fs.readFileSync(file, 'utf8')
const edits = []

// 1) 加高「对话地图」行：30px -> 40px，图标与字号同步放大
if (s.includes('  padding: 6px 10px;\n  border: none;\n  border-radius: 8px;\n  background: transparent;')) {
  s = s.replace(
    '  padding: 6px 10px;\n  border: none;\n  border-radius: 8px;\n  background: transparent;',
    '  /* Taller hit area: 30px read as a cramped strip and was easy to miss-click. */\n  min-height: 40px;\n  box-sizing: border-box;\n  padding: 9px 12px;\n  border: none;\n  border-radius: 8px;\n  background: transparent;\n  font-size: 14px;',
  )
  edits.push('toggleRow: 40px 高、字号 14px、内边距 9/12')
}
s = s.replace(
  '.toggleIcon {\n  width: 18px;\n  height: 18px;\n  flex: none;\n}',
  '.toggleIcon {\n  width: 20px;\n  height: 20px;\n  flex: none;\n}',
)
edits.push('toggleIcon: 18 → 20px')

// 2) 准心按钮放大：宽侧栏 24 -> 32px，图标 15 -> 20px
s = s.replace(
  '.toggleWrapWide .backToCurrent {\n  width: 24px;\n  height: 24px;\n}',
  '.toggleWrapWide .backToCurrent {\n  width: 32px;\n  height: 32px;\n  border-radius: 8px;\n}',
)
s = s.replace(
  '.toggleWrapWide .backToCurrentIcon {\n  width: 15px;\n  height: 15px;\n}',
  '.toggleWrapWide .backToCurrentIcon {\n  width: 20px;\n  height: 20px;\n}',
)
s = s.replace(
  '.backToCurrentIcon {\n  width: 14px;\n  height: 14px;\n  flex: none;\n}',
  '.backToCurrentIcon {\n  width: 16px;\n  height: 16px;\n  flex: none;\n}',
)
edits.push('backToCurrent: 32px 按钮 / 20px 图标')
fs.writeFileSync(file, s, 'utf8')
console.log(edits.join('\n'))
