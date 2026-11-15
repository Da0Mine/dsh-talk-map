import fs from 'node:fs'
{
  const file = 'src/host/routes.ts'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    'approxTokens: Math.round((essentialChars + toolChars) / 2),',
    '// 4 chars/token: the same rough ratio the shell shows for this corpus (mixed zh/code).\n            approxTokens: Math.round((essentialChars + toolChars) / 4),',
  )
  fs.writeFileSync(file, text, 'utf8')
}
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    "  'spawn.contextAvailable': '本次会话可注入约 {a} 个字符（≈{t} tokens）。',",
    "  'spawn.contextAvailable': '本次会话可注入约 {a} 个字符（≈{t} tokens，按 4 字符/token 粗估）。',",
  )
  text = text.replace(
    "  'spawn.contextAvailable': 'This session carries about {a} characters (≈{t} tokens).',",
    "  'spawn.contextAvailable': 'This session carries about {a} characters (≈{t} tokens at a rough 4 chars/token).',",
  )
  fs.writeFileSync(file, text, 'utf8')
}
console.log('token estimate aligned to 4 chars/token')
