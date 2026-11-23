import fs from 'node:fs'
// 1) liquid-glass.ts：加一个可选的 specularBezel（默认仍按插件 safeBezel*2.5）
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('specularBezel')) {
    t = t.replace(
      `  /** Rim highlight strength (0 disables the specular pass). */
  specularOpacity?: number`,
      `  /** Rim highlight strength (0 disables the specular pass). */
  specularOpacity?: number
  /** Width of the specular band in px; defaults to the plugin's safeBezel * 2.5. */
  specularBezel?: number`,
    )
    t = t.replace(
      'const bgVar = options.bgVar ?? \'--dsw-alias-bg-base\'',
      'const bgVar = options.bgVar ?? \'--dsw-alias-bg-base\'\n  const specularBezel = options.specularBezel',
    )
    t = t.replace(
      'const specUrl = specularOpacity > 0.001 ? generateSpecularMap(width, height, radius, safeBezel * 2.5) : \'\'',
      'const specBand = specularBezel ?? safeBezel * 2.5\n    const specUrl = specularOpacity > 0.001 ? generateSpecularMap(width, height, radius, specBand) : \'\'',
    )
    fs.writeFileSync(f, t, 'utf8')
    console.log('liquid-glass: specularBezel 选项')
  }
}
// 2) StatusRail：把手用同一套玻璃，高光带 6px
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    'return installLiquidGlass(element, { specularOpacity: 0 })',
    'return installLiquidGlass(element, { specularBezel: 6 })',
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('把手：高光带 6px')
}
