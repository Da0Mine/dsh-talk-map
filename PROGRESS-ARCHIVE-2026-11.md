# PROGRESS 归档 · 2026-11

> 从 PROGRESS.md 按「只留最近 5 条」规则原样移入，不改写、不删减。

- **视口渲染：拖拽卡顿主因**（`0.1.91`）：`@xyflow/react` 12.12 的 `onlyRenderVisibleElements` 一直没开，视口外卡片也在挂载。开启（>120 张时）后离线基准（无头 Edge 1600×1000，真实中键拖拽）：800 张 DOM 9308→1036、p95 36→19ms；1600 张 DOM 18108→1036、p95 26→19ms；中位帧稳 17ms。probe 148/148。基准脚本 `scripts/_bench-drag.mjs`（造卡→拖拽→采样帧间隔）。

- **按 issue 修一轮**（`0.1.90`）：合并社区 PR #4（`session-actions.ts` 补 `callRpc` 导入，删除会话不再抛 ReferenceError）与 PR #5（归档会话不再回到地图：`placeableSessionIds` 接收 `archivedSessionIds` 并在 `visibleCards` 里剔除）；#1 的 digest TDZ 经核对在当前 `lib/index.js` 已不复存在（`const session = args[0]` 已在使用之前，且无 `shouldAuto`），属旧版本问题；#2 新增 `IMPORT_CAP=120`（导入工作区/同步文件夹一次最多放 120 张，超出量用 toast 告知），#6 新增 `PREVIEW_BATCH=40`（每次轮询最多请求 40 个会话的末条消息，不再一次性打 1000 个 surface）。probe 148/148。

- **两个侧栏共用一套排序**（`0.1.89`）：新增 `src/client/queue-order.ts`，优先级「异常终止(error) > 等你回复(waiting) > 待查看(done) > 正在运行(running) > 待发送(draft)」，同一优先级内按 `updatedAt` 倒序；地图 rail 与原生侧栏都调 `sortQueueRows`，不再各排各的。手动拖拽只在**同一优先级组内**重排（跨不了优先级），所以两边永远同序。实测镜像页两边 chip 序列完全一致：等你回复 → 待查看×2 → 正在运行 → 待发送×2；单测 `test/queue-order.test.mjs` 5/5（阶梯、整体分组、组内时间、拖拽不跨组、compare 对称性）。

- **探针端口改为运行时挑选空闲端口**（`0.1.89`）：固定 9333 上残留了一个查不到归属的监听（pid 31900 已不可查），闸门正确拒绝连接后把探针改成 `listen(0)` 取空闲端口再 spawn Edge。改完 `node test/probe.mjs` → **148/148**（含此前失败的「拉伸撞到相邻文件夹」）。

- **文件夹拉伸压邻居 2px**（`0.1.88`）：`.wsFrame` 是 `content-box`，几何却按外框算，1px 边框被额外加上 → 视觉右边缘比几何多 2px。加 `box-sizing: border-box` 后镜像页实测 overlap 2 → 0（daily right 945 / medkit x 945）。

- **`/talk-map/client-boot` 每秒 404**（`0.1.88`）：客户端 `rpc.ts`（搜索/跳转失败上报）与 `jump-highlight.ts`（跳转诊断）一直在打这个路由，宿主从未实现。选择"保留诊断、补宿主空路由"：`POST /talk-map/client-boot` 只读请求体并回 `{ok:true}`，不落盘。

- **探针安全闸**（同批）：`test/probe.mjs` 加四道闸——CDP 端口被占用即拒跑、要求 `/json/version` 的 Browser 以 `Edg/` 开头、改用 `context.newPage()` 而非 `pages()[0]`、目标页是 DSH（38373 / `__DSH_BOOT__`）则抛错。**原因：2026-11-18 该探针把 8791 的测试页导航进了 DSH 桌面窗口，随后停服务导致 `Desktop page failed to load … ERR_CONNECTION_REFUSED`，整个 app 退出。**

- **两侧栏都显示「待发送」卡片，优先级最低**（`0.1.87`）：`StatusRailEntry.lamp` 改为可选并加 `draft` 标记；地图 `statusEntries` 在 `glowOf` 为空时若该会话有草稿就补一条（`draft:true`、正文=草稿）；侧栏 `rows` 同理。排序：带灯的手动顺序不变，待发送一律 append 到最后（按更新时间倒序）。无灯时卡片不加灯阴影、胶囊换成黄色「待发送」。踩坑：侧栏原来有 `...(drafts[id] ? { draft: drafts[id] } : {})` 把布尔 `draft` 覆盖成字符串，导致排序失效（已删）；StatusRail 的 `ordered` 用字符串锚点替换没匹配上（静默无效），改按行号替换才生效。实测两侧栏顺序均为 正在运行 → 等你回复 → 待查看×2 → 待发送×3。

- **已知遗留（非本版引入）**：probe「拉伸撞到相邻文件夹就停住」稳定差 2px（右边缘 902 vs 邻居 900），stash 掉本版改动后照样复现，说明是更早版本的问题，待单独修。

- **点开后「待查看」立即消失**（`0.1.86`）：原来要等开地图才消失，原因有三层——① 宿主 `uiSession` 只在 `reconcileStatus` 里、且 `byId[id].retainedBy.mainView > 0` 时才清 `completionUnread`，是异步的；② 本插件自己的 `sessionActivity.finished` 只有 `forget()` 能清，而全项目无人调用它；③ 侧栏原本没有任何乐观更新。修法：点击/回车时 `sessionActivity.forget(id)` + 记入本地 `opened` 集合（只屏蔽 `done` 卡，宿主的判定一旦不再说 done 就自动移出该集合）；`lampOf` 里 `retainedBy.mainView > 0` 直接视为已读；另加一个 effect 把主视图会话的 finished 标记就地清掉。实测点击 s3 后卡片列表 ["s1","s2","s3","s15"] → ["s1","s2","s15"]。

- **侧栏队列与地图侧栏灯判定改为同源**（`0.1.85`）：原来侧栏用会话摘要的 `completed` 推「待查看」，而地图 rail 用 `uiSession.sessionStatus` 的 `completionUnread`——结果侧栏漏掉「待查看」卡片（用户实测 2 张只显示 1 张）。现在 `SidebarQueue` 直接订阅 `getServices().ctx.get('uiSession').sessionStatus`（正是面板 `useSessionStatus` 的底层 store），lampOf 与 glowOf 逐条一致：alert→error、`pendingInteraction`→waiting、`running`→running、`completionUnread`/activity→done。harness 里补了同款 stub。实测两边都是 4 张（正在运行/等你回复/待查看/待查看）一一对应。

- **侧栏底部按钮放大**（`0.1.84`）：「对话地图」行 `min-height:40px`（原 ~30px）、内边距 9/12、字号基准 13→14px、图标 18→20px；准心按钮 24→32px（图标 15→20px）。实测 `mapButton h=40`、`backButton 32×32`、`buttonsVisible:true`。

- **远程控制按钮移出侧栏**（`0.1.82` → `0.1.83` 把 settings.section 的 label 从函数改成字符串，与已工作的 dsh-meme 一致）：之前误以为是本插件的十字准心，已回退（十字准心回到侧栏 footer）。真正的目标是 `ds-harness-remote@0.6.5` —— 它只注册 `shell.overlay` + `sidebar.footer.action`（id `ds-harness-remote-workspace`，class `.dshRemoteSidebarEntry`，无快捷键/无设置入口）。做法：本插件注入一条全局样式 `.dshRemoteSidebarEntry{display:none!important}`（style id `dsh-talk-map-hide-remote-entry`）把它从侧栏藏起来，同时注册 `settings.section`（id `talk-map-remote`，标题「远程控制」）承载一个按钮，点击那个被隐藏的节点来打开它的面板。不改第三方包，删掉 `src/client/RemoteEntry.tsx` 的两处注册即还原。实测：样式注入成功、节点 `display:none`、隐藏节点仍可 `.click()`、侧栏按钮恢复为「对话地图 + 回到当前对话」。

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
