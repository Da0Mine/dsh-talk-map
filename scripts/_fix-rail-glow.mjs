import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')

// 1) 去掉对卡片 box-shadow 的覆盖，恢复状态灯光晕；卡片底色回到接近原亮度
t = t.replace(
  `  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 62%, transparent);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 2px 10px rgba(0, 0, 0, 0.2);`,
  `  /* No box-shadow here: it would beat the lamp classes (.cardLamp*) and swallow the glow. */
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 88%, transparent);
  border-color: rgba(255, 255, 255, 0.14);`,
)

// 2) 面板不再压暗（44% -> 72%），保留一点透光给折射
t = t.replace(
  '  background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 44%, transparent);',
  '  background: color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 72%, transparent);',
)

// 3) 列表左右留出空间，让光晕不被滚动容器裁掉；面板同步加宽
t = t.replace(
  `.statusRailList {
     flex: 1;
     min-height: 0;
     overflow-y: auto;`,
  `.statusRailList {
     flex: 1;
     min-height: 0;
     overflow-y: auto;
     /* Room for the lamp halo: an overflow:auto box clips horizontally, which is why the
        glow only showed above and below the card. */
     padding-left: 12px;
     padding-right: 12px;`,
)
t = t.replace(
  `  --rail-w: calc(var(--rail-card-outer) + var(--rail-pad) * 2 + 2px);`,
  `  --rail-w: calc(var(--rail-card-outer) + var(--rail-pad) * 2 + 26px);`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('亮度与光晕裁剪已修')
