import fs from 'node:fs'
const file = 'PROGRESS.md'
let text = fs.readFileSync(file, 'utf8')
text = text.replace('最新 `0.1.75`', '最新 `0.1.76`')
text = text.replace(
  '## 已完成\n',
  `## 已完成

- **原生侧栏队列**（\`0.1.76\`）：\`sidebar.workspaces\` 是单槽（替换会顶掉原生工作区列表），所以队列挂在已有的 \`sidebar.footer.action\` 列表槽上——该入口渲染成"队列卡片在上、地图开关行在下"的一列，向上占满工作区下方的空白。数据来自新路由 \`POST /talk-map/queue\`（store 里的卡片 join \`sessionQuery.listSessions()\` 的标题/时间），因为卡片状态 hooks 只注入 \`main\` 面板、拿不到侧栏 action 里。宽侧栏（wide）才显示；点击 = 关地图面板 + \`openSessionInUi\`。实测：24 条、显示前 6 条、标题正确、点击 opened=1。
`,
)
text = text.replace(
  '重启 DSH 后打开地图 → 右键任意卡片「重命名」→ 输入几个字确认不再被全选覆盖；若正常，把 `0.1.75` 的改动视为完成。',
  '重启 DSH 后展开左侧栏（收起地图侧栏才会展开），确认工作区下方出现「队列中的任务」卡片列并可点击跳转。',
)
text = text.replace(
  '- `src/client/StatusRail.tsx` — 左侧状态栏（队列列表 + 拖拽避让）',
  '- `src/client/StatusRail.tsx` — 地图内左侧状态栏（队列列表 + 拖拽避让）\n- `src/client/SidebarQueue.tsx` — 原生侧栏里的队列（挂在 sidebar.footer.action）',
)
fs.writeFileSync(file, text, 'utf8')
console.log('PROGRESS.md updated')
