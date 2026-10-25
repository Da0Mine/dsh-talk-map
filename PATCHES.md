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

### 1. 顶部：返回 / 全屏 / 语言 / 快捷键 / 关闭，全部放大

`MapOverlay.tsx`：删掉标题（`对话地图 ·v2`）和会话计数徽标。左上「‹ 返回」（38px 高），
右上依次是 **⛶ 全屏**、语言、快捷键、✕（都 34~38px）。返回与 ✕ 同动作。

表头**不再沿用遮罩层的 top inset**（`--dsh-frame-overlay-top`）——那是给浮在标题栏
下面的 overlay 用的，放到主面板里纯属在顶上留一条死白，已去掉。

### 1b. 全屏

表头 ⛶ 把面板切成 `position: fixed; inset: 0`（`.panelFullscreen`），直接铺满整个窗口
（侧栏轨道也盖住）。用 fixed 而不是换容器，是为了不重挂 React Flow——视口、缩放、
选中都原样保留。Esc 第一下退全屏、第二下退地图。

### 2. 工作区 = 可伸缩的文件夹，卡片按固定槽位吸附

新增 `src/client/grid-layout.ts`（纯函数，可单测）：

- 文件夹宽度决定列数（`colsForWidth`），卡片落在 272×176 的槽位上，**永不重叠**；
- 高度不够就自动长高（`frameRect`），宽度不小于一列；
- **顺序 = 画布自己的顺序（阅读序）**：拖动可以改位置/顺序；**活跃会话会自动顶到开头**
  ——某个会话的 `updatedAt` 往前跳（刚发完消息、刚开始跑）就把它的卡提到本文件夹第一格，
  只提一次（已经在第一位就不动），新导入的卡不算"活跃"、仍排最后；
- 位移动画由 CSS 完成：`.react-flow__node` 有 200ms `transform` 过渡，被拖的那张卡
  带 `tmDragging` 类例外（1:1 跟手）。

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

### 3. 双击

- 双击空白canvas：新对话（工作区选择器默认值不变）；
- 双击某个工作区的**任何部分**（标题、边框、透明内部）：新对话且**工作区预选成该工作区**
  （透明内部靠事件穿透到 pane + `groupAtPoint`，标题/边框靠 `data-id^="frame-"` 判断；
  两个文件夹叠在一起时取**面积更小**的那个，因为指针真正落在它身上）；
- 草稿卡新增**模式**选择：`标准模式` / `创造模式`（分别对应 `agentPreset` 的
  `standard` / `cordis`，只列出当前部署真有的预设），默认标准模式。

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
