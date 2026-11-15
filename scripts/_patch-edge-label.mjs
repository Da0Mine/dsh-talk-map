import fs from 'node:fs'
// 1) 给 context 一个自己的标签（当前上下文注入），与摘要注入区分开
{
  const file = 'src/client/MapCanvas.tsx'
  let text = fs.readFileSync(file, 'utf8')
  const before = `              label: kind === 'none'
                ? t('edge.none')
                : kind === 'full'
                  ? t('edge.full')
                  : t('edge.injected'),`
  const after = `              label: kind === 'none'
                ? t('edge.none')
                : kind === 'full'
                  ? t('edge.full')
                  : kind === 'context'
                    ? t('edge.context')
                    : t('edge.injected'),`
  if (!text.includes(before)) throw new Error('label block not found')
  fs.writeFileSync(file, text.replace(before, after), 'utf8')
}
// 2) 文案
{
  const file = 'src/client/i18n.ts'
  let text = fs.readFileSync(file, 'utf8')
  const zh = "  'edge.injected': '注入',"
  const en = "  'edge.injected': 'Injected',"
  if (!text.includes(zh) || !text.includes(en)) throw new Error('i18n edge anchors missing')
  text = text.replace(zh, zh + "\n  'edge.context': '注入 · 当前上下文',")
  text = text.replace(en, en + "\n  'edge.context': 'Injected · current context',")
  fs.writeFileSync(file, text, 'utf8')
}
console.log('context edge label added')
