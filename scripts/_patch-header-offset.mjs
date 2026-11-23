import fs from 'node:fs'
// 1) MapOverlay：量出顶部栏高度，写到面板 CSS 变量
{
  const f = 'src/client/MapOverlay.tsx'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('--tm-header-h')) {
    t = t.replace(
      `    const disposeGlass = installLiquidGlass(element, { radius: 16, bezel: 28, thickness: 60, ior: 2.2, scale: 10, specular: 0.3 })`,
      `    const disposeGlass = installLiquidGlass(element, { radius: 16, bezel: 28, thickness: 60, ior: 2.2, scale: 10, specular: 0.3 })
    // The header floats over the canvas; the canvas keeps its old top offset through this
    // measured variable so frames do not slide under the glass strip.
    const panel = element.parentElement
    const publish = (): void => {
      panel?.style.setProperty('--tm-header-h', \`\${Math.round(element.getBoundingClientRect().height)}px\`)
    }
    publish()
    const sizeObserver = new ResizeObserver(publish)
    sizeObserver.observe(element)`,
    )
    t = t.replace(
      `    return () => {
      disposeGlass()
    }`,
      `    return () => {
      sizeObserver.disconnect()
      panel?.style.removeProperty('--tm-header-h')
      disposeGlass()
    }`,
    )
  }
  fs.writeFileSync(f, t, 'utf8')
  console.log('MapOverlay: --tm-header-h 已接')
}
// 2) CSS：画布按该变量下移
{
  const f = 'src/client/talk-map.module.css'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes('--tm-header-h')) {
    t += `
/* Canvas keeps the height the in-flow header used to occupy, so the floating glass strip
   never swallows the top of a workspace frame. */
.canvas {
  margin-top: var(--tm-header-h, 59px);
}
`
    fs.writeFileSync(f, t, 'utf8')
    console.log('CSS: .canvas 偏移已加')
  }
}
