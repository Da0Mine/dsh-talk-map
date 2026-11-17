# dsh-talk-map 进度

## 当前目标

维护 `D:\Plugins\dsh-talk-map`（DSH 对话地图插件，已发 npm `dsh-talk-map`，最新 `0.1.76`）。
本机通过 `link:D:/Plugins/dsh-talk-map` 接入 desktop profile；改完客户端/宿主代码必须**重启 DSH** 才生效。

## 已完成

- **侧栏只留地图开关 + 队列可拖动调高**（`0.1.81`）：十字准心「回到当前对话」从侧栏 footer 移到地图面板头部（`MapOverlay` 的 header，`data-talkmap-back` 随之搬走），footer 只剩一个「对话地图」；队列顶部加了 hover 才显形的手柄（`.queueGrip`，opacity 0→1，`cursor:ns-resize`），拖动改高度并写 `localStorage['dsh.talk-map.queueHeight']`，范围 76px～70vh，双击还原自适应。实测：手柄藏/显 0→1、拖 120px 高度 312→438 且落盘 432、地图按钮仍可见、面板头部十字准心 title=回到当前对话。

- **侧栏队列布局改用内联样式**（`0.1.80`）：查出宿主真实容器 —— `footArea{flex-direction:column; flex:none; align-items:center}` 里放 `footerActions{display:flex}`（**行**）。之前按钮和队列并排、按钮被垂直居中，就是因为依赖 CSS 类且受行布局影响。现在外层/控制行/队列块/卡片宽度全部走内联样式（`flex-direction:column`、`width:100%`、`flex:1 1 100%`、`maxHeight:46vh`、列表 `overflowY:auto`），不再受安装副本里 CSS 是否生效影响。实测（镜像宿主容器、390px 侧栏）：卡片 x=12 w=365 撑满、按钮 y=862 在底部、`buttonsVisible:true`、点击 opened:1。

- **侧栏队列与地图侧栏对齐**（`0.1.79`）：只显示**带灯**的卡片（与地图 rail 的 `glowOf` 同一套判定：alert→error、`pendingInteraction`→waiting、`running`→running、`completed`/activity→done），不再把整板 100+ 张卡塞进去；卡片 `width:100%`+`box-sizing:border-box` 撑满侧栏（原来继承 rail 的固定宽度，右边被截、左边像留白）；整块上限收到 `30vh` 并内部滚动，工作区列表不再被压扁。实测：3 张带灯卡、卡片宽 177/容器 203、两个按钮可见、点击 opened:1。

- **侧栏队列改用真实卡片**（`0.1.78`）：数据全部客户端读（卡片集来自 `canvas` store、标题来自 `getServices().sessions.list`、正文用 `/talk-map/last-user` 批量取前 14 张、草稿优先），渲染直接复用地图 rail 的 `.card + .statusRailCard`，所以外观与地图侧栏卡片一致（标题/两行正文/时间/「待发送」胶囊）。footer 改为纵向（队列在上、`.toggleControls` 一行在下），队列 `max-height:42vh` 内部滚动，**两个原按钮不再被挤出屏幕**。实测：24 张卡、列表 355/2688 可滚动、`buttonsVisible:true`、点击 `opened:1`。

- **原生侧栏队列**（`0.1.76`）：`sidebar.workspaces` 是单槽（替换会顶掉原生工作区列表），所以队列挂在已有的 `sidebar.footer.action` 列表槽上——该入口渲染成"队列卡片在上、地图开关行在下"的一列，向上占满工作区下方的空白。数据来自新路由 `POST /talk-map/queue`（store 里的卡片 join `sessionQuery.listSessions()` 的标题/时间），因为卡片状态 hooks 只注入 `main` 面板、拿不到侧栏 action 里。宽侧栏（wide）才显示；点击 = 关地图面板 + `openSessionInUi`。实测：24 条、显示前 6 条、标题正确、点击 opened=1。

- **重命名窗口打字被全选覆盖**（`0.1.75`）：`RenameDialog` 的 `useEffect(..., [props])` 依赖了 `props` 对象——函数组件每次渲染都是新引用，于是每输入一个字就重跑 effect 并执行 `input.select()`，下一个字覆盖全文。改为 `onDoneRef` 持有最新回调 + `[]` 仅挂载时执行一次（打开时仍全选一次，保留"直接输入替换旧名"的行为）。`DigestDialog` 同款写法一并修（它每次渲染都重挂 ESC 监听）。
- 侧栏「当前任务」块已按要求整块删除（`0.1.74`），侧栏只剩「队列中的任务」列表。
- 待发送时卡片正文显示草稿本身（`0.1.72`）；侧栏卡片三态点击（单击进对话 / 双击地图定位 / 位移 >4px 拖拽改序）。
- 连线分叉面板「当前上下文」模式（`0.1.69`→`0.1.70`），宿主路由 `POST /talk-map/context-window`：扣掉 `compaction/prune` 点名的 seq，默认不截断。
- 修好构建链（`0.1.69`）：`npm run build` 曾只产出 `dist/index.mjs`，而包指向 `lib/index.js`，导致宿主侧改动发不出去；现在 build = `tsdown && copy-host && normalize-client-banner`。
- 宿主边校验枚举补 `context`（`0.1.71`），此前中间模式建卡后连线被 zod 拒收、卡片在而线消失。

## 进行中

无。

## 下一步

重启 DSH 后展开左侧栏（收起地图侧栏才会展开），确认工作区下方是卡片式队列、可滚动、底部「对话地图」与十字准心两个按钮仍在。

## 坑与未决

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
