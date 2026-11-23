import fs from 'node:fs'
// 1) liquid-glass：恢复显式 scale 覆盖（默认仍用插件公式）
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('scale?: number')) {
    t = t.replace(
      `  /** Extra blur appended to the backdrop filter. */
  blurAmount?: number`,
      `  /** Extra blur appended to the backdrop filter. */
  blurAmount?: number
  /** Explicit displacement in px; overrides the plugin's maxDisp * 0.8 formula. */
  scale?: number`,
    )
    t = t.replace(
      "  const specularBezel = options.specularBezel",
      "  const specularBezel = options.specularBezel\n  const explicitScale = options.scale",
    )
    t = t.replace(
      'const scale = Math.min(maxDisp * 0.8, scaleCeiling)',
      'const scale = explicitScale ?? Math.min(maxDisp * 0.8, scaleCeiling)',
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('liquid-glass: scale 可显式覆盖')
  }
}
// 2) StatusRail：按钮用 8px 位移（小元素可控），面板保持公式
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    'return installLiquidGlass(element, { specularBezel: 6 })',
    'return installLiquidGlass(element, { scale: 8, specularBezel: 6 })',
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 按钮 scale 8')
}
// 3) CSS：撤掉我们对按钮的覆盖，恢复插件自带的 52% 填充 + blur(16px)
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  const at = t.indexOf('/* Handle: the panel\'s recipe, line for line')
  if (at < 0) throw new Error('tab override block missing')
  t = t.slice(0, at).trimEnd() + '\n'
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 按钮恢复插件原样式（52% 底 + blur16）')
}
