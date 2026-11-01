/**
 * harness.js 注入 demo 模式：?demo=1 时换成虚构演示数据。
 * 探针（不带参数）行为零变化。
 */
import fs from 'node:fs'

const file = 'test/harness.js'
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

const anchor = lines.findIndex(line => line.includes('const globalState = {'))
if (anchor < 0) {
  console.error('globalState anchor missing')
  process.exit(1)
}

const block = [
  '  // ---- demo=1: fictional showcase data ------------------------------------',
  '  // Everything a first-time viewer sees on the demo page is invented here:',
  '  // workspace names, session titles, card bodies, digests. The probe runs',
  '  // without the flag and keeps its own fixtures untouched.',
  '  if (demoMode === true) {',
  '    const wsNames = {',
  "      'ws-daily': '产品设计', 'ws-medkit': '内容运营',",
  "      'ws-lab': '灵感速记', 'ws-sync': '团队共享',",
  '    }',
  '    for (const ws of workspaceList) {',
  '      ws.title = wsNames[ws.workspaceId] ?? ws.title',
  `      ws.path = 'D:/Demo/' + ws.workspaceId`,
  '    }',
  '    // More conversations so the folders and the stack drawer feel lived-in.',
  `    sessionRows.s11 = session('s11', '官网改版方案', { updatedAt: T0 - 3 * MIN })`,
  `    sessionRows.s12 = session('s12', '官网改版方案（分叉）', { updatedAt: T0 - MIN, parentId: 's11' })`,
  `    sessionRows.s13 = session('s13', '海报文案三选一', { updatedAt: T0 - 20 * MIN })`,
  `    sessionRows.s14 = session('s14', '短视频脚本打磨', { updatedAt: T0 - 45 * MIN })`,
  `    sessionRows.s15 = session('s15', '投放数据复盘', { updatedAt: T0 - 3 * 60 * MIN, completed: true })`,
  `    sessionRows.s16 = session('s16', '选题灵感池', { updatedAt: T0 - 6 * MIN })`,
  `    workspaceList[0].sessionIds.push('s11', 's12', 's13')`,
  `    workspaceList[1].sessionIds.push('s14', 's15')`,
  `    workspaceList[2].sessionIds.push('s16')`,
  '    // Cards for the new sessions: initial coordinates sit inside the frame;',
  '    // the folder layout re-slots them when the board opens.',
  `    const demoAdd = (sessionId, rect, row = 0) => {`,
  '      cards[`card-${++counter}`] = {',
  `        boardId: 'inbox',`,
  '        sessionId,',
  '        x: rect.x + PAD,',
  '        y: rect.y + PAD + LABEL + row * (CARD_H + GAP_Y),',
  '        createdAt: T0,',
  '      }',
  '    }',
  `    demoAdd('s11', frames['ws-daily'], 0)`,
  `    demoAdd('s12', frames['ws-daily'], 0)`,
  `    demoAdd('s13', frames['ws-daily'], 0)`,
  `    demoAdd('s14', frames['ws-medkit'], 0)`,
  `    demoAdd('s15', frames['ws-medkit'], 0)`,
  `    demoAdd('s16', frames['ws-lab'], 0)`,
  '    sessionsState = { ids: Object.keys(sessionRows), byId: sessionRows }',
  '    // Fictional card bodies (the last human message) for the showcase.',
  '    Object.assign(userMessages, {',
  `      s1: '把首页改成瀑布流布局，移动端的断点要单独调',`,
  `      s2: '把这周的数据汇总成周报，重点看留存和转化两条曲线',`,
  `      s3: '客户反馈按功能归类，标出出现三次以上的关键词',`,
  `      s4: '插画按风格分文件夹，命名统一加日期前缀',`,
  `      s5: '竞品的新功能逐条对比，输出一张差异表',`,
  `      s11: '官网首屏文案换三版轮播，先做静态页验证',`,
  `      s12: '分叉自官网改版：只讨论配色与字体，不动布局',`,
  `      s13: '海报主视觉用插画风，标题字要够大够克制',`,
  '    })',
  '    Object.assign(digests, {',
  `      s11: { atSeq: 6, summary: '首屏轮播三版文案定稿，静态页已可预览。', keyFindings: [], nextStep: '接入真实图片后走查断点', generatedAt: T0 - 2 * MIN },`,
  `      s12: { atSeq: 3, summary: '配色候选：墨绿 / 暖灰 / 靛蓝，字体沿用系统栈。', keyFindings: [], nextStep: '出两版对比稿', generatedAt: T0 - MIN },`,
  '    })',
  '    // One more lamp so the drawer shows a green card as well.',
  `    statusById.set('s15', { completionUnread: true })`,
  '  }',
  '',
]

const out = [...lines.slice(0, anchor), ...block, ...lines.slice(anchor)]
fs.writeFileSync(file, out.join('\n'), 'utf8')
console.log('demo dataset injected')
