/**
 * demo 模式下摘要（digest）整体换成虚构内容——原 fixture 的摘要来自真实会话。
 */
import fs from 'node:fs'

const file = 'test/harness.js'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

const anchor = [
  '    Object.assign(digests, {',
].join(D)
if (!source.includes(anchor)) {
  console.error('digest anchor missing')
  process.exit(1)
}
source = source.replace(
  anchor,
  [
    '    // The probe digests quote real sessions; in demo mode they are all',
    '    // fictional. Replace the whole table instead of patching entries.',
    '    for (const key of Object.keys(digests)) delete digests[key]',
    '    Object.assign(digests, {',
  ].join(D),
)

const oldEntries = [
  `      s11: { atSeq: 6, summary: '首屏轮播三版文案定稿，静态页已可预览。', keyFindings: [], nextStep: '接入真实图片后走查断点', generatedAt: T0 - 2 * MIN },`,
  `      s12: { atSeq: 3, summary: '配色候选：墨绿 / 暖灰 / 靛蓝，字体沿用系统栈。', keyFindings: [], nextStep: '出两版对比稿', generatedAt: T0 - MIN },`,
].join(D)
const newEntries = [
  `      s11: { atSeq: 6, summary: '首屏轮播三版文案定稿，静态页已可预览。', keyFindings: [], nextStep: '接入真实图片后走查断点', generatedAt: T0 - 2 * MIN },`,
  `      s12: { atSeq: 3, summary: '配色候选：墨绿 / 暖灰 / 靛蓝，字体沿用系统栈。', keyFindings: [], nextStep: '出两版对比稿', generatedAt: T0 - MIN },`,
  `      s1: { atSeq: 9, summary: '首页瀑布流布局完成桌面端，断点待调。', keyFindings: [], nextStep: '移动端走查', generatedAt: T0 - MIN },`,
  `      s2: { atSeq: 4, summary: '周报模板定稿：留存、转化两图加一段结论。', keyFindings: [], nextStep: '补上周环比', generatedAt: T0 - 10 * MIN },`,
].join(D)
if (!source.includes(oldEntries)) {
  console.error('digest entries anchor missing')
  process.exit(1)
}
source = source.replace(oldEntries, newEntries)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('demo digests fictionalised')
