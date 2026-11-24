import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `  background: transparent;
  border-radius: 0 20px 20px 0;`,
  `  background: transparent;
  /* The plugin ships blur(10px) here. A backdrop filter on a full-height panel both softens what
     is behind it and leaves a stale snapshot while the rail is resized, so it goes. */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 0 20px 20px 0;`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('CSS: 面板去掉 blur(10px)')
