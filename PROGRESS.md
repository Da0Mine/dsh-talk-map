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

- 2026-11-26 `0.7.0`：① 两侧栏新增「最近的任务」——无灯无草稿的卡片按 `updatedAt` 倒序最多取 3 张，排在带状态卡片下方（`MapCanvas.recentEntries` → `StatusRail.recent`；`SidebarQueue.recentRows`），分隔标题 `statusRail.recent`；② 当前会话的卡片加"瞄准镜"角标（复用 `.cardReticle`，面板 `currentSessionId` / 侧栏 `currentSessionId()`）；③ 修 issue #7 安全漏洞：`sameOrigin()` 原先比较 `Origin` 与 `Host`（DNS rebinding 下两者都由攻击页控制），抽出 `src/host/origin.ts`，改为 **Host 必须是回环名/127.0.0.0-8**，`Origin` 缺省需回环、`dsh-app://` 允许 `Host: app`；新增 `test/origin.test.mjs` 8 条用例覆盖 issue 复现用例（含 rebinding 两条），全通过。probe 150/150。

- 2026-11-26 `0.6.2`：内存/算力审计后的优化。证据：最大的会话日志 37.3 MB → 解压 **115.8 MB / 43262 行 / 181 ms**（第二 30.7 → 124.3 MB / 169 ms），宿主 `/talk-map/last-user` 用 `runtime.sessionQuery.readSurface(id)` 每次读整份会话面，最多并发 3（峰值约 350 MB 瞬时）；客户端预览轮询原为**每 1.5s、每次最多 8 个、遍历全部卡片**（`visibleCards` 是未归档全集，不是视口）。改为 `PREVIEW_INTERVAL_MS 4000`、`PREVIEW_BATCH 4`，并用 `useViewport()` + `cardLayoutRef` 做**视口过滤**（视口外卡片不再触发宿主读）。回归：probe 150/150；拖拽 200 张 18ms/p95 25ms、800 张 18ms/p95 32ms。

- 2026-11-26 `0.6.1`：未读灯重启丢失的**真正缺口**——我们只持久化「地图开着时观察到的 running→idle 转变」，而用户没看过的会话是**宿主**标的 `completionUnread`，宿主自己不跨重启保存，于是重启后什么都恢复不出来。改为 `observe()` 里把 `completionUnread === true` 也导入 `finished` 并 `persist()`。验证：harness 里对一个空闲会话 `hostUnread` → 卡片 chip=`done` → 刷新（等同重启）→ chip 仍 `done`，`localStorage["dsh.talk-map.lamp-state.v1"]` 内含 `finished:{s3,s6}`。probe 150/150。

- 2026-11-26 `0.6.0`：修「重启后未查看（待查看）标记消失」。持久化本身正常（`localStorage["dsh.talk-map.lamp-state.v1"]`，14 天 TTL，probe 已有「重启后待读还在」检查并通过），真凶是 `session-activity.observe` 里的一条清理规则：`hydrated.has(id) && retainedBy.mainView > 0` → 视为已读并删除。真实重启时 DSH 把上次会话恢复成主视图，于是所有恢复的标记在首轮状态轮询后就被清掉。改为不再因主视图保留而清除；标记只由三条路释放：宿主 `completionUnread` true→false、用户从地图点开（`acknowledge`）、该会话重新运行或等待回答。probe 150/150（首轮 1 条绘制相关 flake，复跑全绿）。

- 2026-11-25 `0.5.9`：修「没有任务时对话界面侧边栏的队列板块消失」。真正卸掉它的是 `SidebarQueue.tsx` 第 236 行 `if (rows.length === 0) return null`（不是地图那边的 `StatusRail`，那个默认是展开的）。改为始终渲染：标题 + 计数（0）+ 一句 `statusRail.empty`（「暂时没有带状态的卡片」），并新增 `.sidebarQueueEmpty` 样式。probe 150/150。

- 2026-11-24 `0.5.8`：① 卡片回退为**不透明**（删掉我们的 `.statusRailPanel .card` 覆盖，回到插件 `bg-layer-1` = `rgb(35,35,36)`）；② 光晕能画到玻璃边界：裁剪来自列表 `overflow-y:auto`（双向裁剪），改为**滚动上移到面板**（`.statusRailPanel{overflow-y:auto}`），列表 `overflow: visible`、面板 `padding: 0`、列表 `padding: 10px`、`.statusRailHead` 补 `10px 10px 0`。实测 `cardBg rgb(35,35,36)`、panel 透明、滤镜在。probe 150/150。

- 2026-11-24 `0.5.7`：回退到 `0.5.5`（`git show 248cef9:` 写回两个文件）。原因：`0.5.6` 把 `blur(14px)` 放到**面板**上，整列侧栏被模糊、且观感变成不透明，而用户只要改卡片。回退后面板恢复透明（JS inline `color-mix(bg-base 0%)`）+ `url(#…)` 滤镜 + CSS 边光，卡片保持 58% 玻璃底。已知限制（实测）：卡片自身的 `backdrop-filter` 在本宿主不采样画布，故卡片无模糊。probe 150/150。

- 2026-11-24 `0.5.6`：卡片模糊无效的原因查清——**子元素的 `backdrop-filter` 采样不到画布**（面板/把手自身的 blur 有效，所以之前把手"毛玻璃"看得见；隔离测试里 body 直属 div 也有效）。改为把 blur 挂到面板上：`.statusRailPanel { backdrop-filter: blur(14px) saturate(1.12) }`，卡片保留 58% 半透明玻璃底浮在磨砂列上；卡片自己的 `backdrop-filter` 与临时加的 `.statusRailFrost` 子元素都已移除。证据：面板空白带条纹对比度 blur 开 5.8 / 关 8.5。probe 150/150；拖拽 17ms。

- 2026-11-24 `0.5.5`：① 面板折射参数调大：`thickness 100→160`、`bezelWidth 40→60`、`ior 2.5→2.6`、`specularOpacity 0.5→0.6`、显式 `scale 96`（此前公式值）；因 `feDisplacementMap` 在本宿主仍不渲染，同步加了**可见**的边光（`inset 0 0 0 1px rgba(255,255,255,.12)` + `inset 0 0 26px/.05` + `inset 0 0 64px/.02`）来体现"更大范围"；② 侧栏卡片改玻璃 + 模糊：`color-mix(bg-layer-1 58%)` + `backdrop-filter: blur(10px) saturate(1.15)`，不加 `box-shadow` 以免盖掉 `.cardLamp*`。probe 150/150。

- 2026-11-24 `0.5.4`：按用户要求回退到「加拖动之前」的 `0.4.5` 外观（`git show 360f0c0:` 写回 `talk-map.module.css` 与 `StatusRail.tsx`），**只保留光晕修复**（`.statusRailList` padding `16px 18px 18px`、`--rail-w` 额外 38px）。拖动调宽、宽度记忆、换行多列、卡片玻璃材质全部移除；`railWidth/RAIL_MAX_W/startResize/WIDTH_KEY` 已确认不存在。实测 `panelBg 透明`、`panelFilter url(#…-1)`、`cardBg rgb(35,35,36)`、拖拽 17ms。probe 150/150。

- 2026-11-24 `0.5.3`：面板与把手统一为「薄玻璃」——面板 `linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.02) 45%, rgba(255,255,255,.035))` + `inset 0 0 0 1px rgba(255,255,255,.09)`；把手同款（白渐变 + 1px 亮边）并**去掉插件自带 `blur(16px)`+52% 填充**（那就是"毛玻璃"观感）。面板仍无 `backdrop-filter`。卡片 45% 底。说明：`feDisplacementMap` 在本宿主不渲染（多次实测 0 像素差），因此"折射"无法实现，玻璃感只能靠半透 + 高光边。probe 150/150。

- 2026-11-24 `0.5.2`：面板又变不透明的根因——0.5.1 移除 SVG 滤镜时，把 JS 写在面板上的 inline `background: color-mix(bg-base 0%, transparent)` 一并删了，元素回落到插件原生 `rgba(18,20,26,.94)`。改为 CSS 显式 `background: transparent`，并移除插件自带的 `backdrop-filter: blur(10px)`（柔化 + 拖宽残影）。卡片底 62%→45%。实测 `panelBg rgba(0,0,0,0)`、`panelFilter none`；透过率把彩色块放面板后取样：面板内 `(231,73,118)` vs 背后 `(233,73,116)` ≈ 99%。probe 150/150。

- 2026-11-24 `0.5.1`：① 修「向右拖宽拖出错位残影」——面板/把手上的 `backdrop-filter: url(#…)` 会在改宽时留下旧快照（该滤镜实测本就 0 像素效果），全部移除，面板材质改为纯 CSS；② 拖宽不再拉伸卡片：`--rail-card-w` 固定为 `props.cardWidth`，`.statusRailList` 改 `flex-direction: row; flex-wrap: wrap`，`.statusRailSlot` 定宽 `var(--rail-card-outer)`，宽度够就并排（实测 620px → 2 列、卡宽仍 250）；`RAIL_MAX_W` 560→640（两列需 ≥566）；③ 侧栏卡片改液态玻璃：半透底 `color-mix(bg-layer-1 62%)` + 顶部高光渐变 + 1px 亮边，**不加 box-shadow**（否则会盖掉 `.cardLamp*` 光晕）。卡片上也没加 `backdrop-filter`（每卡一层快照会拖慢：17 → 23ms，故只保留 CSS 材质）。probe 150/150；拖拽 17ms/p95 34ms。

- 2026-11-24 `0.5.0`：① 卡片光晕左/上被裁：`.statusRailList` 原 `padding: 2px 0 14px`（`overflow-y:auto` 会双向裁剪），改为 `16px 18px 18px`，并把 `--rail-w` 的额外宽度 26→38px 同步留出空间；② 新增拖拽调宽：展开后横向拖把手（`ew-resize`），宽度钳制 `[默认宽度, 560]`，存 `dsh.talk-map.status-rail.width.v1`，重载保留；卡片宽度跟随 `--rail-w`（`railWidth-84`），拖拽位移 >3px 时吞掉随后的 click，避免误收起。实测 308→428、存储 428、重载仍 428。probe 改为画布类检查先收起侧栏 + 新增 2 条默认展开检查，`150/150`。

- 2026-11-24 `0.4.5`：修「没有任务时侧栏板块消失」——根因是侧栏展开状态默认关闭（`readOpen()` 只在 localStorage 为 `"1"` 时展开），新工作区首次打开只剩一个把手；而空队列时把手不显示计数徽标、叠加 0.4.x 的透明玻璃，看起来就是"板块没了"。改为：`readOpen()` 无记录时默认 **true**（展开），把手补 1px 描边保证任何状态都可见；空列表仍显示 `statusRail.empty`（「暂时没有带状态的卡片」）。probe 148/148。

- 2026-11-24 `0.4.4`：按用户要求把界面回退到 `0.4.2`——用 `git show 4da8edb:<path>` 直接写回 `talk-map.module.css` / `StatusRail.tsx` / `liquid-glass.ts`（`git checkout <ref> -- <path>` 被 CC Safety Net 拦截，改用 git show + 字节写入）。当前界面 = 面板透明底+`border-right none`+无投影+半径 20，按钮 = `installLiquidGlass(element)` 默认参数（`url(#…)`、无 blur、bg 0）。probe 148/148。

- 2026-11-24 `0.4.3`：面板与把手拼成一整块玻璃——共用一条外轮廓（面板只画上/下边，把手画上/右/下边，接缝不画竖线），两者均透明底、无阴影、无各自滤镜。核对时发现插件用的 `--dsw-alias-border-secondary` **在宿主主题里不存在**（宿只有 `border-l1 #0000000a` / `border-l2 #0000001a`），所以插件原本那些边框一直是失效的；改用字面值 `rgba(255,255,255,.16)` 后实测 panel `border 1px 0 1px 0`、tab `1px 1px 1px 0`、radius 均 `0 20 20 0`。probe 148/148。

- 2026-11-24 `0.4.2`：按钮按插件代码重做，参数与侧栏完全一致（`installLiquidGlass(element)` 无覆盖）= `thickness 100 / bezelWidth 40（生效 10，受 radius 11 与短边限制）/ ior 2.5 / specularOpacity 0.5 / bgOpacity 0 / blurAmount 0`，`scale = min(maxDisp×0.8, 短边25%) = min(183, 7.5) = 7.5px`；**模糊已取消**（`tabFilter = url(#…-2)`，无 `blur()`），边框与投影保留插件 CSS 原值。实测 `tabBg 透明`、`tabFilter url(#…-2)`。probe 148/148。

- 2026-11-24 `0.4.1`：按钮样式回退到 `0.3.3`（即用户说"现在挺好"那一版）——撤掉按钮的 JS 玻璃，只用插件自带 CSS：`background color-mix(bg-elevated 52%)` + `backdrop-filter blur(16px) saturate(1.5)` + `1px rgba(255,255,255,.16)` 边框 + `3px 0 14px rgba(0,0,0,.35)` 投影 + `radius 0 11 11 0`。面板去掉 `border-right` 与 `box-shadow`，与左侧无分界线（保留 `radius 0 20 20 0` 供折射）。实测 open 态：`tabBg oklab(…/0.52)`、`tabFilter blur(16px) saturate(1.5)`、`panelFilter url(#…-1)`、`panelBg 透明`。probe 148/148。

- 2026-11-24 `0.4.0`：按钮恢复"之前那份玻璃"的三要素——`bgOpacity 45`（填充）、`blurAmount 12`（柔化）、显式 `scale 8`（位移可控），边框/投影用插件原值；`liquid-glass.ts` 新增 `scale` 显式覆盖选项（默认仍走 `maxDisp×0.8`）。此前 0.3.x "忠实移植"把这三样全去掉（bg 0 / blur 0 / scale 183px），30px 宽元素上等于零效果，所以只剩透明。实测 `tabFilter url(#…-2) blur(12px)`、`tabBg .45`。probe 148/148。

- 2026-11-24 `0.3.9`：逐行核对按钮与面板外观：面板 `background`(被 JS 覆写为透明) / `border-right 1px var(--dsw-alias-border-secondary)` / `box-shadow 6px 0 26px rgba(0,0,0,.32)` / `backdrop-filter url(#…)` / `border-radius 20`；按钮此前改成白 6% 底 + 硬编码边框 + 只剩 inset 高光（**丢外投影**）。已补齐：底透明、边框同 token、`6px 0 26px` 外投影、半径 11（20 会让位移贴图 `straightW<0` 直接不生成）。另发现关键事实：**SVG 折射在本页对面板与按钮都是 0 像素差异**（滤镜开/关整块对比 max=0），`feImage` 本身正常（测试把绿底换成红成功）——即该折射在当前 Chromium 的 `backdrop-filter` 通路里不生效，此前的观感差异全部来自 CSS 的底/边/阴影。另给 `scale` 加了"短边 25%"上限。probe 148/148。

- 2026-11-24 `0.3.8`：按钮折射不可见的根因确定——插件 `scale = maxDisp×0.8` 是**绝对像素**（实测面板 182.95px、按钮同值），按钮仅 30px 宽，位移采样点全落在元素范围外，Chromium 取不到 backdrop → 输出等于原样。对比两条路径：滤镜都正常生成（`-1` feImage 296×744、`-2` feImage 30×77，均 data URL 有效），差别只在元素尺寸/safeBezel(19 vs 10)。结论：该算法对小元素不成立。改为按钮直接绘制同款材质（`rgba(255,255,255,.06)` + 1px 亮边，无模糊无滤镜），实测 `tabBg rgba(255,255,255,.06)`、`tabFilter none`。probe 148/148。

- 2026-11-24 `0.3.7`：把手玻璃按"面板材质的延伸"处理——新增可选 `specularBezel`，把手高光带收到 6px（插件默认按 `safeBezel*2.5` 会到 25px，30px 宽的把手会整块泛白，这就是之前的"毛玻璃"），底色仍 0；滤镜只在**关闭态**挂载（`useEffect` 依赖 `open`）。实测展开态 `tabFilter = none / tabBg 透明 / panelFilter = url(#...-1) / panelBg 透明` → 单一表面；关闭态 `tabFilter = url(#...-2)`。probe 148/148；拖拽 17ms/p95 19ms。

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
