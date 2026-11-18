import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b85 · 搜地图上的卡片（标题/正文）'", "'b86 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b85 · Search cards on the map'", "'b86 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.86'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.85`', '最新 `0.1.86`')
p = p.replace('## 已完成\n', `## 已完成

- **点开后「待查看」立即消失**（\`0.1.86\`）：原来要等开地图才消失，原因有三层——① 宿主 \`uiSession\` 只在 \`reconcileStatus\` 里、且 \`byId[id].retainedBy.mainView > 0\` 时才清 \`completionUnread\`，是异步的；② 本插件自己的 \`sessionActivity.finished\` 只有 \`forget()\` 能清，而全项目无人调用它；③ 侧栏原本没有任何乐观更新。修法：点击/回车时 \`sessionActivity.forget(id)\` + 记入本地 \`opened\` 集合（只屏蔽 \`done\` 卡，宿主的判定一旦不再说 done 就自动移出该集合）；\`lampOf\` 里 \`retainedBy.mainView > 0\` 直接视为已读；另加一个 effect 把主视图会话的 finished 标记就地清掉。实测点击 s3 后卡片列表 ["s1","s2","s3","s15"] → ["s1","s2","s15"]。
`)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version)
