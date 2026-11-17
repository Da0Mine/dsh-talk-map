import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
for (const name of ['wtg9ga_footArea', 'wtg9ga_footerActions', 'wtg9ga_settingsArea', 'wtg9ga_regionArea']) {
  const re = new RegExp('\\.' + name + '\\{[^}]*\\}', 'g')
  const found = [...s.matchAll(re)].map(m => m[0])
  console.log('##', name, found.length)
  for (const f of found.slice(0, 6)) console.log('  -', f)
}
