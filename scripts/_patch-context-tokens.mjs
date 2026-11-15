import fs from 'node:fs'
const file = 'src/client/SpawnPreview.tsx'
let text = fs.readFileSync(file, 'utf8')
text = text.replace(
  "  const [contextStats, setContextStats] = useState<{ available: number; kept: number } | undefined>(undefined)",
  "  const [contextStats, setContextStats] = useState<{ available: number; kept: number; tokens: number } | undefined>(undefined)",
)
text = text.replace(
  "        setContextStats({ available: page.availableChars, kept: page.chars })",
  "        setContextStats({ available: page.availableChars, kept: page.chars, tokens: page.approxTokens })",
)
text = text.replace(
  "{t('spawn.contextAvailable', { a: String(contextStats.available) })}",
  "{t('spawn.contextAvailable', { a: String(contextStats.available), t: String(contextStats.tokens) })}",
)
fs.writeFileSync(file, text, 'utf8')
console.log('stats wired')
