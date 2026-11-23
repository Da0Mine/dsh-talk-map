import fs from 'node:fs'
const i18n = 'src/client/i18n.ts'
let t = fs.readFileSync(i18n, 'utf8')
t = t.replace("'b93 · 搜地图上的卡片（标题/正文）'", "'b94 · 搜地图上的卡片（标题/正文）'")
t = t.replace("'b93 · Search cards on the map'", "'b94 · Search cards on the map'")
fs.writeFileSync(i18n, t, 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.1.94'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
let p = fs.readFileSync('PROGRESS.md', 'utf8')
p = p.replace('最新 `0.1.93`', '最新 `0.1.94`')
const entry = [
  '## 已完成',
  '',
  '- **运行中的卡片不显示「待发送」**（`0.1.94`）：草稿胶囊原来只在 lamp 为空时渲染，带灯卡片（运行中/等你回复/待查看）即使有草稿也看不到。改为两个胶囊并列，先「待发送」再状态灯；StatusRailEntry.draft 与侧栏行在有灯时也置位。实测 s1（running + 草稿）两侧栏 chips 均为 ["待发送","正在运行"]，正文显示草稿；probe 148/148，与地图侧栏顺序一致。',
].join('\n')
p = p.replace('## 已完成', entry)
fs.writeFileSync('PROGRESS.md', p, 'utf8')
console.log('bumped', pkg.version, '| i18n b94:', fs.readFileSync(i18n, 'utf8').includes('b94 ·'))
