# dsh-talk-map 进度

## 恢复块
- 目标：dsh-talk-map（DSH 对话地图插件）持续迭代，npm `dsh-talk-map` 已到 `0.1.96`，仓库 Da0Mine/dsh-talk-map
- 当前阶段：0.1.96 已发布（地图侧栏液态玻璃 + 拖动时冻结模糊），等用户重启验收
- 已完成（本轮）：液态玻璃（高光/折射边/流动光带/玻璃卡）+ 拖动降级（独立 store，不触发画布重渲染）
- 下一步：用户重启后确认玻璃观感与拖拽帧率；若观感偏灰可调 `--dsw-alias-bg-elevated` 的混合比例
- 决策：性能优先——画布移动时用静态渐变替代 `backdrop-filter`，静止时恢复 16px 模糊
- 未决风险：浅色主题只在离线 harness 里验过（真实宿主浅色未验）；鼠标拖拽期间若高频起停可能看到模糊切换
- 关键文件：`src/client/talk-map.module.css`（玻璃层）、`src/client/rail-glass.ts`、`src/client/StatusRail.tsx`、`src/client/MapCanvas.tsx`
- 验证：probe 148/148；玻璃开/关 A/B 拖拽均中位 17ms、p95 19ms；`data-frozen` 拖动中 1、松手 400ms 后 0

## 当前目标

维护 `D:\Plugins\dsh-talk-map`（DSH 对话地图插件，已发 npm `dsh-talk-map`，最新 `0.1.76`）。
本机通过 `link:D:/Plugins/dsh-talk-map` 接入 desktop profile；改完客户端/宿主代码必须**重启 DSH** 才生效。


## 已完成

- 2026-11-23 `0.1.97`：侧栏玻璃按 iOS26 清透风格重做（去流动光带、模糊 22→10px、底色 20% + 白高光层、1.5px 亮边、卡片 30% 透明玻璃瓦片）；A/B 拖拽玻璃开/关均中位 16–17ms、p95 19ms；probe 148/148。

- **地图侧栏液态玻璃**（`0.1.96`）：面板从 94% 不透明的实色改成半透明渐变 + `backdrop-filter: blur(16px) saturate(190%) brightness(1.08)`；`::before` 做镜面高光、`::after` 用 mask-composite 做 1px 折射边；`.railSheen` 是缓慢漂移的光带（`prefers-reduced-motion` 下关闭）；侧栏卡片改成 70% 透明的玻璃瓦片 + 菲涅尔边。性能：首次实测侧栏展开时拖拽中位 33ms/p95 91ms（800 张卡），改为「静止才模糊」——画布移动时 `data-frozen=1` 换成静态渐变、卡片去掉嵌套 `backdrop-filter`、冻结状态走独立 store（`rail-glass.ts`，不触发画布重渲染）——同页面 A/B 预热后玻璃开/关均为中位 17ms、p95 19ms；实测 `data-frozen` 拖动中为 1、松手 400ms 后回 0，静止时 `backdrop-filter: blur(16px) saturate(1.9) brightness(1.08)`。probe 148/148。

- **预览读取的内存峰值**（`0.1.95`）：实测 `/talk-map/last-user` 读单个会话 1 907 ms、宿主 +72 MB；12 个并发 24 127 ms、宿主 862→2 245 MB。旧客户端一次发 40 个 → 峰值可达 GB 级。改法（语义不变）：宿主新增 `src/host/preview.ts`（`runLimited` 全局并发 3 + 400 条按 stamp 的文本缓存），客户端改为发送 `{id, stamp}`、每轮 8 个且按最新优先、页面隐藏时不轮询；草稿扫描先按字符串粗筛再 `JSON.parse`。新增 `test/preview.test.mjs`（并发上限/空列表/LRU 淘汰 3 项全过）。probe 148/148；基准 800/1600 张：挂载卡片 69、DOM 1 036、p95 19–21 ms、堆 12–35 MB。

- **运行中的卡片不显示「待发送」**（`0.1.94`）：草稿胶囊原来只在 lamp 为空时渲染，带灯卡片（运行中/等你回复/待查看）即使有草稿也看不到。改为两个胶囊并列，先「待发送」再状态灯；StatusRailEntry.draft 与侧栏行在有灯时也置位。实测 s1（running + 草稿）两侧栏 chips 均为 ["待发送","正在运行"]，正文显示草稿；probe 148/148，与地图侧栏顺序一致。

- **digest 清理与保留上限**（`0.1.93`）：本机 `talk_map.json` 里 digests 1178 条（655 KB），其中只有 122 条对应存在的卡片。新增 `pruneDigests(store, cap=400)`：启动时删掉没有卡片的 digest，再把可用的按 `generatedAt` 旧→新裁到 400 条，日志打印 `pruned X orphaned + Y over-cap digests, Z kept`。

- **新建会话要开地图才出现（侧栏）**（`0.1.92`）：侧栏队列原先行源是 `canvas.cards`，而新会话的卡片由 MapCanvas 挂载时的 effect 才补建 → 不开地图就看不到。改为按**会话列表**建行（`sessions.ids`，过滤 blank / subagent / 归档），带灯即出现；卡片只用来给地图定位。归档集合来自 `ctx.workspaces`（运行时是 `ClientWorkspaceModel`，有 `getSnapshot/subscribe`，`archivedSessionIds` 在其中）。踩坑：给这个订阅写的空快照 `() => ({})` 每次返回新对象，直接触发 React #185 无限重渲染，必须用模块级常量。实测：`addSession(running:true)` 后侧栏立刻出现该会话（`lamp=running`），此时 `hasCard=false`、板上仍是 24 张卡、`selectedPanel=null`（全程没开地图）；probe 148/148；两侧栏顺序仍一致。

## 进行中

无。

## 下一步

重启 DSH 后展开左侧栏（收起地图侧栏才会展开），确认工作区下方是卡片式队列、可滚动、底部「对话地图」与十字准心两个按钮仍在。

## 坑与未决

- **别在固定 CDP 端口上"等到有响应就开始操作"**：那可能是别人的浏览器/宿主窗口。必须校验身份并开新页；停本地静态服务前先确认没有界面正在加载它（否则 ERR_CONNECTION_REFUSED 会把整个 Desktop 带下去）。

- `useEffect` 依赖写 `[props]` 等于"每次渲染都跑"：函数组件 props 每次都是新对象。改动对话框/弹层时一律用 ref 持有回调 + `[]`。
- 按文本锚点打补丁容易切在块内嵌套的 `: null}` 上，删代码块一律按行号定位后用 splice。
- npm 发布：token 存在（granular，90 天，All packages，读写 + 绕过 2FA），发布时需带 `--//registry.npmjs.org/:_authToken=`。
- git push 常报 `schannel: server closed abruptly`，重试几次或加 `-c http.sslBackend=schannel` 可过。

## 关键文件

- `src/client/RenameDialog.tsx` / `src/client/DigestDialog.tsx` — 本次修复点
- `src/client/MapCanvas.tsx` — 画布、卡片数据、右键菜单
- `src/client/StatusRail.tsx` — 地图内左侧状态栏（队列列表 + 拖拽避让）
- `src/client/SidebarQueue.tsx` — 原生侧栏里的队列（挂在 sidebar.footer.action）
- `src/client/SpawnPreview.tsx` — 连线分叉面板（摘要 / 当前上下文 / 完整对话）
- `src/host/routes.ts` / `src/host/store.ts` — 宿主路由与边 schema
- `scripts/copy-host.mjs` — 构建后半段（dist → lib）
- `test/probe.mjs` — 148 项端到端自检
