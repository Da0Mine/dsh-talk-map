import fs from 'node:fs'
// 删掉 StatusRail 里已无用的 byId
{
  const f = 'src/client/StatusRail.tsx'
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  const at = lines.findIndex(l => l.includes('const byId = new Map(props.entries.map'))
  if (at >= 0) {
    lines.splice(at, 1)
    fs.writeFileSync(f, lines.join('\n'), 'utf8')
    console.log('StatusRail: removed unused byId')
  }
}
// 确认侧栏 memo 尾部
{
  const f = 'src/client/SidebarQueue.tsx'
  const l = fs.readFileSync(f, 'utf8').split('\n')
  const at = l.findIndex(x => x.includes('return sortQueueRows(out)'))
  console.log('--- 侧栏 memo 尾部 ---')
  for (let i = at - 3; i <= at + 4; i += 1) console.log(String(i + 1).padStart(4), l[i] ?? '')
}
