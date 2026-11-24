import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')

// 面板：极薄玻璃（淡高光 + 1px 亮边），仍然透
t = t.replace(
  `  background: transparent;
  /* The plugin ships blur(10px) here. A backdrop filter on a full-height panel both softens what
     is behind it and leaves a stale snapshot while the rail is resized, so it goes. */
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 0 20px 20px 0;`,
  `  /* Thin glass: a whisper of white so the surface reads as a pane, low enough that the canvas
     stays visible. No backdrop-filter: it cannot refract in this engine and it smears on resize. */
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02) 45%, rgba(255, 255, 255, 0.035));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.09);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 0 20px 20px 0;`,
)

// 按钮：同一套薄玻璃，并去掉插件的 blur(16px) 毛玻璃
if (!t.includes('/* The handle: same thin pane, no frost.')) {
  t += `
/* The handle: same thin pane as the panel, no frost. The plugin's own rule paints a 52% chip
   with blur(16px) saturate(1.5); that is what reads as frosted glass. */
.statusRailTab {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
`
}
fs.writeFileSync(f, t, 'utf8')
console.log('CSS: 面板/按钮统一薄玻璃，按钮去毛玻璃')
