const s = [
  '把卡片改成网格槽位',
  '',
  'Time sampled while preparing turn 14: x',
  '',
  '<system-reminder> hi </system-reminder>',
  '',
  'MNEMON RUNTIME MEMORY SNAPSHOT',
  'Revision: deadbeef',
  '',
  'Current runtime context. y',
  'Current working directory: z',
].join('\n')

const patterns = [
  [/<system-reminder>[\s\S]*?<\/system-reminder>/gi, ' '],
  [/^\[?Time sampled while preparing[^\n]*$/gim, ' '],
  [/^\s*MNEMON RUNTIME MEMORY SNAPSHOT[\s\S]*$/im, ' '],
  [/^\s*Current runtime context\.[\s\S]*$/im, ' '],
]

let out = s
for (const [pattern, replacement] of patterns) {
  const before = out
  out = out.replace(pattern, replacement)
  console.log(pattern.source, '→', before === out ? 'no change' : 'changed')
}
console.log('RESULT:', JSON.stringify(out.replace(/\s+/g, ' ').trim()))
