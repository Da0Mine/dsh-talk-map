import fs from 'node:fs'
const file = 'src/client/talk-map.module.css'
let sheet = fs.readFileSync(file, 'utf8')
sheet = sheet.replace(
  `  max-height: 34vh;
  overflow-y: auto;
  padding: 0 8px;
  overscroll-behavior: contain;`,
  `  /* The footer slot is anchored to the bottom of the sidebar, so the list grows upward
     into the empty area under the workspace list and scrolls once it runs out. */
  max-height: 46vh;
  overflow-y: auto;
  padding: 0 8px 6px;
  overscroll-behavior: contain;`,
)
sheet = sheet.replace(
  `.sidebarQueue {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 4px 0 2px;
}`,
  `.sidebarQueue {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  padding: 4px 0 2px;
  margin-top: 4px;
}`,
)
fs.writeFileSync(file, sheet, 'utf8')
console.log('queue grows upward, max 46vh')
