import fs from 'node:fs'
const file = 'src/host/routes.ts'
let text = fs.readFileSync(file, 'utf8')
const before = `          let text = lines.join('\\n\\n')
          let truncated = false
          if (text.length > maxChars) {
            text = text.slice(text.length - maxChars)
            const cut = text.indexOf('\\n\\n')
            if (cut > 0 && cut < 400) text = text.slice(cut + 2)
            truncated = true
          }`
const after = `          // Tool output is the bulk (a real 34k-record log: 5106 tool lines vs 1229 human
          // ones, 2.4M chars) and the model does not need every byte of it. Over budget:
          // keep the human/assistant line first, then add tool lines from the newest end
          // while they fit. That keeps the conversation readable instead of truncating
          // the tail into a tool-output wall.
          const essential = lines.filter(line => !line.startsWith('TOOL ') && !line.startsWith('RESULT: '))
          const tooling = lines.filter(line => line.startsWith('TOOL ') || line.startsWith('RESULT: '))
          let text = essential.join('\\n\\n')
          let truncated = false
          if (text.length > maxChars) {
            text = text.slice(text.length - maxChars)
            const cut = text.indexOf('\\n\\n')
            if (cut > 0 && cut < 400) text = text.slice(cut + 2)
            truncated = true
          } else {
            const room = maxChars - text.length
            const kept: string[] = []
            let used = 0
            for (let index = tooling.length - 1; index >= 0; index -= 1) {
              const line = tooling[index]!
              if (used + line.length + 2 > room) { truncated = true; break }
              kept.push(line)
              used += line.length + 2
            }
            if (kept.length > 0) {
              kept.reverse()
              text = \`\${text}\\n\\n[tool activity]\\n\${kept.join('\\n\\n')}\`
            }
            if (kept.length < tooling.length) truncated = true
          }`
if (!text.includes(before)) throw new Error('trim block not found')
text = text.replace(before, after)
// default budget a bit smaller: ~20k tokens
text = text.replace("const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 60000", "const requested = typeof body?.maxChars === 'number' ? Math.round(body.maxChars) : 40000")
fs.writeFileSync(file, text, 'utf8')
console.log('trim strategy: essentials first, tool output last')
