import fs from 'node:fs'
const file = 'src/host/routes.ts'
let text = fs.readFileSync(file, 'utf8')
const before = `          // The native sidebar's queue list. Cards live in this plugin's store; titles and
          // timestamps come from the Host's session records, sorted newest first.
          const cards: { cardId: string; sessionId: string }[] = []
          for (const [cardId, card] of store.cards.entries()) {`
const after = `          // The native sidebar's queue list. Cards live in this plugin's store; titles and
          // timestamps come from the Host's session records, sorted newest first.
          // \`store\` is NOT in scope here — every route opens it through storeReady (the
          // table is created lazily), which is what the neighbouring handlers do too.
          const store = await storeReady
          const cards: { cardId: string; sessionId: string }[] = []
          for (const [cardId, card] of store.cards.entries()) {`
if (!text.includes(before)) throw new Error('queue route anchor missing')
text = text.replace(before, after)
fs.writeFileSync(file, text, 'utf8')
console.log('queue route now opens the store via storeReady')
