/** Post the finalized replies to issues #1..#6 (bodies are the user's final edits). */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PREFIX = '鱼6097的自动回复：\n\n'

const replies = {
  1: [
    '这条在 0.1.66 之后的重构里就没了。0.1.90 的 lib/index.js 里监听顺序是先判断 enabled，再 `const session = args[0]`，`shouldAuto` 那段也删了，不会再拿未初始化的 session。',
    '如果你升到 0.1.90 之后还看到这行日志，把它连同版本号发我，我继续跟。',
  ].join('\n\n'),

  2: [
    '0.1.90 加了上限：一次导入工作区或同步文件夹最多放 120 张（按更新时间取最新），没放下的会提示还剩多少个，下次导入继续。',
    '没采用确认框，是因为它挡不住这次的问题：点了确认之后照样把几百上千张卡一次铺满，只是多点一次。上限加提示能保住批量导入，也不会让画面一次被灌满。',
  ].join('\n\n'),

  3: [
    '两个已经修了，用的都是你的 PR：',
    '- 删除会话抛 ReferenceError：PR #4 已合并，0.1.90 起正常。\n- 归档会话回到地图：PR #5 已合并，placeableSessionIds 现在收 archivedSessionIds，visibleCards 也剔掉归档的。',
    '0.1.90 先把卡片预览压到每轮 40 个会话，视口渲染在下一版。',
  ].join('\n\n'),

  4: '合了，谢谢。0.1.90 已发布，删除会话不再抛 callRpc 未定义。',

  5: '合了，谢谢。0.1.90 起归档的会话不会被自动导入回地图，visibleCards 里也过滤了。',

  6: [
    '0.1.90 先做了两处：卡片预览每轮最多读 40 个会话的末条消息（原来一次读上千个），导入和同步一次最多放 120 张卡。',
    '如果你升上去还卡，我需要两个数再决定下一步：实际会话数、最大的 session.v4.jsonl.zstd 大小。下一步两种做法，按数据选：固定行高的虚拟列表，或者同工作区的卡默认折叠成堆叠卡。',
  ].join('\n\n'),
}

const token = (execFileSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
}).toString().split('\n').find(line => line.startsWith('password=')) ?? '').slice('password='.length)

const dir = fs.mkdtempSync(path.join(process.env.TEMP ?? '/tmp', 'reply-'))
for (const [number, body] of Object.entries(replies)) {
  const payload = JSON.stringify({ body: PREFIX + body })
  const file = path.join(dir, `issue-${number}.json`)
  fs.writeFileSync(file, payload, 'utf8')
  const out = execFileSync('curl.exe', [
    '-sS', '--ssl-no-revoke', '-x', 'http://127.0.0.1:7899', '--max-time', '120',
    '-X', 'POST',
    '-H', `Authorization: Bearer ${token}`,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'Content-Type: application/json',
    '-H', 'User-Agent: dsh-reply',
    '--data-binary', `@${file}`,
    `https://api.github.com/repos/Da0Mine/dsh-talk-map/issues/${number}/comments`,
  ]).toString()
  let parsed
  try { parsed = JSON.parse(out) } catch { parsed = { raw: out.slice(0, 120) } }
  console.log(`#${number} → ${parsed.id === undefined ? 'FAILED' : 'posted id=' + parsed.id} ${parsed.message ?? ''}`)
}
