import fs from 'node:fs'
const s = fs.readFileSync('D:/DeepSeek Harness/resources/app.asar').toString('utf8')
const at = s.indexOf('footArea{')
console.log('=== SidebarRoot CSS（footArea/footerActions/settingsArea）===')
const seg = s.slice(Math.max(0, at - 1400), at + 900)
for (const m of seg.matchAll(/\.[A-Za-z0-9]*_?(footArea|footerActions|settingsArea|rail|collapsed)[^{]*\{[^}]*\}/g)) {
  console.log('-', m[0].replace(/\s+/g, ' '))
}
