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

- 2026-11-24 `0.3.6`：`bgOpacity` 30→0（完全透明，只剩折射）。实测把彩色块放面板后面、隐藏卡片后取样：`bgOpacity 0` 时面板内像素与背后原色**完全一致** `(233,73,116)`，即 100% 透过。把手的"毛玻璃"其实来自插件原始 CSS（`.statusRailTab` 注释 "Frosted glass"，`blur(16px) saturate(1.5)` + 52% 底），已连同它自己的折射滤镜一起去掉，现在只是图标。probe 148/148；拖拽 21ms/p95 26ms。

- 2026-11-24 `0.3.5`：消除"两块玻璃叠加"——把手玻璃改为**仅关闭态**挂载（`useEffect` 依赖 `open`），展开态再用 CSS 去掉它的底色/边框/滤镜，只留图标；面板左缘保持 0 圆角、无边框，与左侧连成整体。参数核对：`thickness 100 / bezelWidth 40（实际生效 19，受 radius 20 限制）/ ior 2.5 / specularOpacity 0.5 / bgOpacity 30 / blur 0`，`scale = maxDisp×0.8 = 183px`（插件原公式；窄面板下边缘位移很大，属该算法特性）。probe 148/148；拖拽 17ms。

- 2026-11-24 `0.3.4`：① 侧栏把手也挂同一套折射（实测 `tabFilter = url(#...-2)`、`borderRadius 0 11 11 0`、底色 30%）；② 面板底 `bgOpacity` 50→30，实测面板像素 `rgb(20,20,21)` vs 画布 `rgb(20,20,20)`，视觉上与旁边融为一体。probe 148/148；拖拽 17ms/p95 22ms。

- 2026-11-24 `0.3.3`：按用户要求删掉模糊——`blurAmount` 默认 2→0（该值源自 echo 插件 `liquidGlassParams.blurAmount: 2`），`backdrop-filter` 现在只有 `url(#id)`，纯折射无模糊。实测 `panelFilter = url("...-1")`、面板底 `color(srgb .0823/.0823/.0902 / .5)`、卡片仍是原始 `rgb(35,35,36)`。probe 148/148；拖拽 17ms。

- 2026-11-24 `0.3.2`：**完全照搬 echo-liquid-glass**——`liquid-glass.ts` 重写为逐行对应其实现（Snell 剖面 → 位移贴图 → `feDisplacementMap`；`scale = maxDisp * 0.8`；滤镜属性 `x/y/width/height` 用百分比；specular 贴图带宽 = `safeBezel * 2.5`），参数取源码默认值 `thickness 100 / bezelWidth 40 / ior 2.5 / specularOpacity 0.5 / bgOpacity 50 / blurAmount 2`，背景由 JS 写 `color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent)`。CSS 只剩一条 `border-radius: 0 20px 20px 0`（折射需要非零半径），删掉此前所有自加的白色渐变/边框/阴影/卡片覆盖；把手不再单独挂玻璃。实测：面板 `rgb(21,21,22)`、卡片 `rgb(35,35,36)`（原始 token）、画布 `rgb(20,20,20)`。probe 148/148；拖拽 17ms。

- 2026-11-24 `0.3.1`：删掉自己加的白色雾层（`rgba(255,255,255,.14/.08/.12)` 渐变与白色描边环）——echo-liquid-glass 本身不含任何白色填充，只有折射 + 滤镜内的高光。改为纯主题色半透明：面板 `color-mix(bg-layer-1 74%)`、卡片 90%；实测 面板 `rgb(31,31,32)`、卡片 `rgb(35,35,35)`、画布 `rgb(20,20,20)`，无白色叠加。probe 148/148；拖拽 17ms/p95 19ms。

- 2026-11-24 `0.3.0`：**亮度问题真因**——`--dsw-alias-bg-elevated` 在宿主主题里不存在（实测只有 bg-base / bg-layer-1..3），我前几轮所有 `color-mix(var(--dsw-alias-bg-elevated, #14161c) N%)` 都落到回退色 `#14161c`（近黑），所以"调大不透明度"= 覆盖更多黑色，用户观感就是一轮比一轮暗。改为不依赖该变量：面板 = 白色渐变提亮 + `rgba(18,20,26,.5)`，卡片 = 白渐变 + `rgba(30,32,38,.62)`。实测像素：面板 `rgb(52,53,55)`、卡片 `rgb(62,63,67)`，画布 `rgb(20,20,20)`（改造前约 20,22,28，现在明显更亮且半透明）。拖拽 17–18ms。probe 148/148。

- 2026-11-23 `0.2.9`：亮度到头——面板 97%（实测像素 `rgb(20,22,28)`，与 `--dsw-alias-bg-elevated` 原值一致）、卡片直接用 `var(--dsw-alias-bg-layer-1)` 不透明。用户截图实测左侧面板 `rgb(21,22,27)` / 右侧画布 `rgb(20,20,20)`（面板本就略亮），且卡片仍能透出，说明他在跑 72% 的旧包（0.2.8 发布于其后）。probe 148/148。

- 2026-11-23 `0.2.8`：亮度对齐原样——面板 72%→92%、卡片 88%→96%；实测面板 `oklab L=0.2008 / 0.92` ≈ 应用底色 `rgb(21,21,23)`，卡片 `L=0.2565 / 0.96` ≈ `rgb(35,35,36)`（与原始 token 一致）。同时把折射带 44→36、位移 30→22，减少宽带宽把面板外侧近黑像素拉进来造成的"整体变暗"错觉。probe 148/148。

- 2026-11-23 `0.2.7`：修两处——① 面板底色 44%→72%、卡片 62%→88%，不再压暗；② 卡片光晕只剩上下：`.statusRailPanel .card` 的 `box-shadow` 覆盖了 `.cardLamp*`（特异性 0,2,0 胜 0,1,0），且 `.statusRailList` 的 `overflow-y:auto` 会把横向光晕裁掉。去掉该 `box-shadow` 覆盖 + 列表左右各留 12px（面板宽度 +26px）后，光晕左右恢复。probe 148/148；200 张拖拽 17ms/p95 21ms。

- 2026-11-23 `0.2.6`：按用户要求加大折射——面板 `bezel 26→44`、`scale 14→30`、`ior 2.2→2.5`、`thickness 90→120`、`specular 0.3→0.34`；把手同步 `bezel 14→22 / scale 8→16 / ior 2.4`。视觉检查（亮背板 + 顶角裁剪）无重影，仅顶部边缘出现更厚的玻片拉伸带。probe 148/148；200/800 张拖拽中位 17ms、p95 34ms。

- 2026-11-23 `0.2.5`：按用户要求改成全程完整渲染——冻结机制（`rail-frozen.ts` + 指针监听 + `data-frozen` CSS）整体删除，拖动与静止同一套折射。实测反而更快：200 张卡中位 17ms/p95 35ms、800 张 17/23（此前「拖动关采样」那条路因为滤镜开关本身引发重绘，A/B 里反而是 33ms）。probe 148/148。

- 2026-11-23 `0.2.4`：修「侧栏折射消失」——面板与把手共用同一个 SVG 滤镜 id，后注册的把前一个顶掉（实测两个 `svg#dsh-talk-map-liquid-glass-svg`、两个 `filter#dsh-talk-map-liquid-glass`，面板那块是 272×844、把手那块 30×77）。改为每个实例自增 id（`-1`/`-2`），实测面板与把手各用自己的滤镜。另：冻结只在画布内起手时触发，并加 4s 看门狗，避免指针事件丢失后一直停在无折射状态。probe 148/148；200 张拖拽 17ms/p95 20ms。

- 2026-11-23 `0.2.3`：顶栏恢复原样（删掉 header 玻璃/悬浮/透明面板/画布偏移，`.panel` 回到不透明）；侧栏折射带宽 40→26（位移仍 14）。拖拽卡顿根因实测：整块面板挂 `backdrop-filter` 时每帧多 ~16ms，与模糊半径无关；改由 window `pointerdown/up` 驱动冻结（React Flow 的 onMoveStart 在脚本拖拽里不触发，mid-pan `data-frozen` 曾一直是 0），拖动期间不采样、加浓底色 → 中位 50→18ms。probe 148/148。

- 2026-11-23 `0.2.2`：顶栏跳位根因是 `.panel` 没有 `position`，绝对定位的 header 以 shell 为参照跑到宿主顶栏上；加 `.panel { position: relative }` 后 `offsetParent` 实测回到 `tm_panel`，黑边与重叠消失。侧栏把手（`.statusRailTab`）也挂上折射。probe 148/148；面板+顶栏+把手三处滤镜拖拽仍 17ms / p95 19ms。

- 2026-11-23 `0.2.1`：按反馈修——删掉鸿蒙光晕；折射位移 58→14px、带宽 26→40px（范围更大更平缓，消掉"内容错位/重影"）；顶部栏改为悬浮在画布之上（`.canvas` 用实测 `--tm-header-h` 补偿），并把 `.panel` 改成透明，玻璃后面终于能看到地图；卡片只保留半透明瓦片。probe 148/148；200/800 张卡拖拽中位 17ms、p95 33ms。

- 2026-11-23 `0.2.0`：侧栏卡片加鸿蒙光效（`installGlow`：跟随光标的径向填充 + mask 2px 内描边，plus-lighter）+ 地图顶部条也做成折射玻璃。踩坑：给每张卡单独挂 `feDisplacementMap` 后拖拽中位帧从 17ms 掉到 50ms（8 个滤镜同时重算），改为卡片只用光效、折射只留面板与顶栏 → 回到 17ms / p95 19ms。probe 148/148。

- 2026-11-23 `0.1.99`：移植 EchoMusic `echo-liquid-glass` 的真实折射（Snell 剖面 → Canvas 位移贴图 → SVG `feDisplacementMap` 作为 `backdrop-filter`），新增 `src/client/liquid-glass.ts`，`StatusRail` 挂载；面板底色 44%、圆角 22、描边高光。性能：200 张卡拖拽中位 17ms/p95 26ms；1600 张 p95 49–55ms（折射滤镜随背景重算）。probe 148/148。

- 2026-11-23 `0.1.98`：玻璃按参考图（iOS26 胶囊）重做并取消状态切换——去掉白色雾层（那层白渐变就是"毛玻璃"来源），模糊 22→3px，厚亮边（2px 内亮线 + 外侧白环 + 内阴影做厚度），`data-frozen` 机制整体删除（实测始终模糊拖拽中位 17ms/p95 19–25ms，与冻结态无差）。probe 148/148。

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
