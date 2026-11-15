import fs from 'node:fs'
const file = 'src/client/talk-map.module.css'
let sheet = fs.readFileSync(file, 'utf8')
// 当前区块现在在最上面：给它一个明确的分隔，标题块跟在下面
sheet = sheet.replace(
  `.statusRailCurrent {
  flex: none;
  padding: 2px 0 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-secondary);
}`,
  `.statusRailCurrent {
  flex: none;
  padding: 0 0 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--dsw-alias-border-secondary);
}`,
)
sheet = sheet.replace(
  `.statusRailCurrentHead {
  padding: 0 4px 6px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-secondary);
}`,
  `.statusRailCurrentHead {
  padding: 0 4px 6px;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-label-secondary);
}`,
)
// 队列标题块：与上方的当前任务区分开
sheet = sheet.replace(
  `.statusRailHead {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 4px 0;
}`,
  `.statusRailHead {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: none;
  padding: 0 4px 6px;
}`,
)
fs.writeFileSync(file, sheet, 'utf8')
console.log('css: current block on top with a divider, queue head below')
