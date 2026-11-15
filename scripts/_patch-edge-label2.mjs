import fs from 'node:fs'
{
  const file = 'src/client/MapCanvas.tsx'
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const at = lines.findIndex(l => l.includes("? t('edge.full')"))
  if (at < 0) { console.log('edge.full line not found'); process.exit(1) }
  const indent = lines[at].match(/^\s*/)[0]
  lines.splice(at + 1, 0,
    indent + ": kind === 'context'",
    indent + "  ? t('edge.context')",
  )
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  console.log('label branch inserted after line', at + 1)
}
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes("'edge.context'")) {
    text = text.replace("  'edge.injected': '注入',", "  'edge.injected': '注入',\n  'edge.context': '注入 · 当前上下文',")
    text = text.replace("  'edge.injected': 'Injected',", "  'edge.injected': 'Injected',\n  'edge.context': 'Injected · current context',")
  }
  fs.writeFileSync(file, text, 'utf8')
}
console.log('i18n edge.context added')
