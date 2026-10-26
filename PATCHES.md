# 本地改造记录（非上游内容）

上游：`github.com/Tasihi89/dsh-talk-map`（npm `dsh-talk-map`）。
本目录是 link 进 desktop profile 的本地副本，以下改动都在上游 0.1.0 基础上手工完成。

## 先读这条

**作者发新版时不要直接更新。** 本目录已经和上游差了很多版本、也改了核心代码，
升级会把下面整份改造覆盖掉。做法：先拉到临时目录做 diff 评估（改了哪些文件、
有没有和本改造打架），评估结论出来再决定合并方式。

## 怎么构建

上游的 `tsdown.config.ts` 没打进 npm 包，所以这个 checkout 原来**无法重建**
`client/client.js`，只能手改打包产物。现在有了一条可复现的替代链路：

```bash
npm run build:client        # scripts/build-client.mjs → client/client.js
npm run harness             # http://127.0.0.1:8791/test/index.html 离线测试台
```

`scripts/build-client.mjs`（esbuild）复刻了宿主要的契约：

- 单行 loader 抬头 `window.__ModuleLoader__.load({ id, factory })` + `factory` 返回 `module.exports`；
- `react` / `react-dom` / `react/jsx-runtime` 保持 external（宿主 `require` 注入）；
- 每个 `.css` 编译成内联 `<style data-plugin-css>` 虚拟模块（等价宿主的 `\0dsh-css:`），
  class / `@keyframes` 加 `tm_` 前缀，`styles.x` 名字表与 CSS 一起生成；
- 产物里不允许出现绝对构建路径（脚本自带断言）。

宿主侧 `lib/index.js` 仍是上游原样，本改造没碰它。

**改完必须重启 DSH**：client bundle 在宿主启动时汇总下发，F5 拿不到新文件。

## 离线测试台（`test/`）

`test/index.html` + `test/harness.js` 用真浏览器加载**构建产物**，喂假 cordis context
（sessions / workspaces / connection / uiWorkspace）和假 `/talk-map/*` 接口，不重启、
不动真实数据就能验证交互：

- `window.__harness.nodeBoxes()` — 卡片 / 工作区的屏幕坐标（布局断言用）
- `window.__harness.posts` — 客户端发出的每个 POST body（持久化断言用）
- `window.__harness.log` — `startSession` / `openSession` 调用记录

`test/` 不在 `files` 白名单里，不会随包发布。

## 改了些什么

### 1. 顶部：返回 / 语言 / 关闭

`MapOverlay.tsx`：删掉标题（`对话地图 ·v2`）和会话计数徽标。左上「‹ 返回」（38px 高），
右上 语言 + ✕（34~38px）。返回与 ✕ 同动作。

表头**不再沿用遮罩层的 top inset**（`--dsh-frame-overlay-top`）——那是给浮在标题栏
下面的 overlay 用的，放到主面板里纯属在顶上留一条死白，已去掉。

快捷键那个 `⌥F` 药丸按钮已按要求删除（`alt+F` 这个绑定本身还在，只是没按钮了）。
曾经加过的 ⛶ 全屏按钮也因效果问题移除了。

### 2. 工作区 = 可伸缩的文件夹，卡片按固定槽位吸附

新增 `src/client/grid-layout.ts`（纯函数，可单测）：

- 文件夹宽度决定列数（`colsForWidth`），卡片落在 272×176 的槽位上，**永不重叠**；
- 尺寸以用户为准：至少一列、至少一行；装不下就折叠（见 2b），不再自动长高；
- **顺序 = 画布阅读序**：拖动可以改位置/顺序；**活跃会话会自动顶到开头**
  ——某个会话的 `updatedAt` 往前跳（刚发完消息、刚开始跑）就把它的卡提到本文件夹
  置顶块之后的第一个位置，只提一次；置顶的卡永远在前；新导入的卡不算"活跃"；
- 位移动画由 CSS 完成：`.react-flow__node` 有 200ms `transform` 过渡，被拖的那张卡
  带 `tmDragging` 类例外（1:1 跟手）。

**八个把手**（`WsFrame.tsx` + CSS）：四边 + 四角都能拉，西/北边拖动时原点跟着走、
对面那条边不动；拉到最小尺寸时按你正在拖的那条边为锚点夹紧。

### 2a. 打开即自动同步

每次打开地图，每个已在地图上的工作区都会自动把"还没有卡片"的会话补进来（按
`updatedAt` 从新到旧排到末尾），不再需要右键手动同步；右键菜单里那条手动同步已移除。

`MapCanvas.tsx`：

- 渲染位置由布局推导（`cardLayout`），拖动中只有被拖的卡用真实坐标；
- 一个「对齐 effect」在非手势期间把推导结果批量写回 store（`canvas.moveCards`，
  一次 undo 帧、一次 POST）；拖动 / 伸缩进行中不写，避免和指针打架；
- 右侧 / 底部 / 右下角三个把手（`WsFrame.tsx`）拖动即伸缩，**伸缩过程中成员跟着
  实时重排**，松手才落盘；拖标题只改文件夹矩形，成员按槽位自动跟随（不再逐张平移）；
- `LAYOUT_VERSION` 3 → 4：首次打开时给有卡片的组补一个矩形，随后卡片被吸到槽位上。

### 2b. 装不下 → 右下角堆叠格子 + 抽屉

文件夹尺寸现在**完全由用户决定**（不再为了装下卡片自动长高）：

- 可见容量 = 列数 × 行数（`capacityFor`），超出的卡片折叠；
- 最后一个可见格子变成**堆叠格**（`StackNode.tsx`）：两张错位的垫片 + 最新一张折叠卡
  的标题 + `+N` 计数，位于文件夹右下角；
- 点它打开**抽屉**（`StackDrawer.tsx`）：列出这个工作区**全部**对话，卡片按 **1:1**
  （224px，就是地图点「1:1」时的大小）排成竖列，滚轮一格切一张（原生非 passive
  监听 + `scrollBy`，`scroll-snap` 对齐），点卡片进对话，Esc / 点背景 / ✕ 收起；
- 折叠的卡只是 `hidden` 节点：连线、选中、位置都还在，把文件夹拉大就自动回到网格。

### 2c. 灯：运行中白光、完成绿光

`talk-map.module.css`：`cardLampRunning` → 白色呼吸（`talkmap-lamp-white`，2.4s），
`cardLampDone` → 稳定绿光（rgb 52,199,89）。error 红、waiting 琥珀不变。

### 3. 双击 / 右键：都以点击处的工作区为准

- 双击空白canvas：新对话（工作区选择器默认值不变）；
- 双击某个工作区的**任何部分**（标题、边框、透明内部）：**跳转到系统的新建对话页面**，
  并把该工作区带上（`uiWorkspace.startSession(workspaceId)`）；
- **右键同样**：文件夹内透明处右键 → 菜单项直接写成「新对话（日常任务）」；文件夹标签
  右键的菜单也加了「新对话」，落到该工作区；
- 地图里**不再有内嵌草稿面板**（`DraftCard.tsx` 已删除）：模式（标准/创造/自定义/…）、
  模型、发送全交给系统那个页面，所以模式列表就是系统那套，不会只有两个；
  同时也不会再出现"发送后没反应"——那是草稿面板用 `startSession` 只预填不发送导致的。

### 3b. 右键菜单：置顶 / 归档 / 删除 / 批量

- **置顶 / 取消置顶**：调 `uiWorkspace.pinSession/unpinSession`，和侧栏的置顶是**同一个**
  pin（状态来自 `workspaces.list.pinnedSessionIds`，双向同步）；被置顶的卡片在文件夹里
  永远排最前，活跃提前不会顶掉它；
- **归档**：`uiWorkspace.archiveSession(id, { stopActivity: true })`，成功后卡片离开地图；
- **删除会话**：POST `dsh-session-recycle-bin/api`（`{action:'trash'|'trashMany'}`）——
  和回收站插件自己的删除对话框走同一个 Host 路由，进同一个回收站、同样可还原；
- **批量操作**：进入批量模式后**每张卡右上角出现勾选框**，单击卡片即勾选（再点取消），
  勾中的框变实心打勾；底部工具条给出「归档 / 删除 / 取消」，删除一次提交 `trashMany`。

### 3c. 单击卡片即跳转

`onNodeClick` 里 sessionCard 直接 `openSession`（原先是双击）。批量模式下卡片的点击被
`onPick` 接管（`stopPropagation`），所以勾选不会误跳转。因为单击不再用于"选中卡片"，
删除/归档等动作走右键菜单。

### 3d. 只有工作区能上色

卡片不再有颜色；**工作区**有：左键点标题栏或边框选中后，画布左上角弹出颜色工具条，
改的是 `wsColors[workspaceId]`，渲染在**边框 + 标题栏**上（`WsFrame.tsx`）。
选别的对象或按 Esc 取消选中，工具条随之消失。

### 3e. 标题栏盖过顶边把手

`.wsFrameLabel` 给了 `z-index: 5`（把手 2~3）：标题栏和顶边把手重叠的那一小块，拖动
永远是**移动整个工作区**，不会被顶边把手截走；要调高度用顶边左右两段或上方两角。

### 4. 地图从"全屏遮罩"改成"主面板窗口"（修 unread 不发光的 bug）

原来注册在 `shell.overlay`（覆盖全屏），对话一直挂在下面 = 一直被当成"你在看"，
所以开着地图时完成的会话永远不会变成待读，卡片也就不发光。

现在注册进 `main` 槽位（`key: 'talk-map'`），和插件市场、回收站、Plugins 页同一个座位：

- 打开 = `ctx.layout.selectPanel('talk-map')`，关闭 = `selectPanel(null)`（回对话）；
- 侧栏按钮 / 快捷键 / 左返回 / 右上 ✕ / Esc 全部走这一条通道；
- 地图在时**没有会话被选中**，宿主自己的 unread 逻辑因此正常工作，卡片能亮；
- 点在卡片上打开对话：先 `openSession`，再 `selectPanel(null)`；
- 面板挂载/卸载就是真实开关状态，`mapUi.open` 只是它的镜像（侧栏按钮高亮用）。

### 4b. 侧栏跟着地图收放

`ctx.layout` 只有 `toggleSidebar()`、没有读状态的口子，所以由侧栏底部这个插件自己的
按钮回报 `wide`（它本来就从 owner props 拿到）：地图打开时若侧栏是展开的，就收起一次性；
面板卸载（返回 / ✕ / Esc / 点卡片进对话 / 发消息离开）时再展开回来。用户本来就把侧栏
收成轨道的话，不动它。

### 5. 对角把手真正双向

右下角把手放大到 **26px**，东/南两条拖拽带**在离角 28px 处就截止**——以前 12px 宽的
边带会盖住角把手的左半边，抓住"角"实际上抓的是边，于是只有宽度跟着动。现在对角
一次同时改宽和高。

## 验收怎么跑

```bash
node test/grid.test.mjs     # 布局纯函数 10 项
node test/probe.mjs         # 无头 Edge 全链路 19 项（自己起静态服务 + 自己的 --user-data-dir）
```

`test/probe.mjs` 只驱动自己拉起的**无头 Edge**（临时 profile，独立调试端口），不碰
用户正在用的浏览器。断言覆盖：头部按钮尺寸/标题已删、卡片不重叠、时间倒序 + 行优先、
运行白光/完成绿光、面板模型（打开/返回/Esc）、拉宽重排、删卡补位、双击工作区新建 +
模式选择 + `agentPreset` 透传、零 JS 异常。


## 已知取舍

- 文件夹之间不做碰撞避让（两个文件夹可以叠在一起）。**叠住时，上面那个文件夹的边框
  会盖住下面那个的角把手**——挪开或先收窄即可；
- 文件夹高度不再自动跟随内容：装不下就折叠成堆叠格（这是设计，不是 bug）；
- 从草稿卡发出的新对话不会自动生成卡片（`startSession` 不返回 sessionId），
  仍要等它出现在侧栏后用「同步该工作区的新会话」。
