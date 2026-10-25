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

### 1. 顶部换成一个返回按钮

`MapOverlay.tsx`：删掉左上角标题（`对话地图 ·v2`）、会话计数徽标和右侧 ✕，
左上角只留「‹ 返回」（关地图回对话）。语言 / 快捷键按钮仍在右侧。

### 2. 工作区 = 可伸缩的文件夹，卡片按固定槽位吸附

新增 `src/client/grid-layout.ts`（纯函数，可单测）：

- 文件夹宽度决定列数（`colsForWidth`），卡片落在 272×176 的槽位上，**永不重叠**；
- 高度不够就自动长高（`frameRect`），宽度不小于一列；
- 顺序 = 按当前坐标的行优先阅读序（`orderCards`），所以拖一张卡到别的槽位就
  **插入到那个位置、其余卡片让位**；删掉一张卡，后面的**自动补位**；
- 位移动画由 CSS 完成：`.react-flow__node` 有 200ms `transform` 过渡，被拖的那张卡
  带 `tmDragging` 类例外（1:1 跟手）。

`MapCanvas.tsx`：

- 渲染位置由布局推导（`cardLayout`），拖动中只有被拖的卡用真实坐标；
- 一个「对齐 effect」在非手势期间把推导结果批量写回 store（`canvas.moveCards`，
  一次 undo 帧、一次 POST）；拖动 / 伸缩进行中不写，避免和指针打架；
- 右侧 / 底部 / 右下角三个把手（`WsFrame.tsx`）拖动即伸缩，**伸缩过程中成员跟着
  实时重排**，松手才落盘；拖标题只改文件夹矩形，成员按槽位自动跟随（不再逐张平移）；
- `LAYOUT_VERSION` 3 → 4：首次打开时给有卡片的组补一个矩形，随后卡片被吸到槽位上。

### 3. 双击

- 双击空白canvas：新对话（工作区选择器默认值不变）；
- 双击某个工作区的**任何部分**（标题、边框、透明内部）：新对话且**工作区预选成该工作区**
  （透明内部靠事件穿透到 pane + `groupAtPoint`，标题/边框靠 `data-id^="frame-"` 判断）；
- 草稿卡新增**模式**选择：`标准模式` / `创造模式`（分别对应 `agentPreset` 的
  `standard` / `cordis`，只列出当前部署真有的预设），默认标准模式。

## 已知取舍

- 文件夹之间不做碰撞避让（两个文件夹可以叠在一起）；
- 删卡后文件夹保持用户设定的高度，底部可能留一行空白（想收紧就拖底边）；
- 从草稿卡发出的新对话不会自动生成卡片（`startSession` 不返回 sessionId），
  仍要等它出现在侧栏后用「同步该工作区的新会话」。
