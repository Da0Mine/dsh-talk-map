/**
 * Faithful port of EchoMusic's `echo-liquid-glass` (MIT).
 *
 * Everything here mirrors the plugin's own defaults and wiring:
 *   thickness 100, bezelWidth 40, ior 2.5, specularOpacity 0.5, bgOpacity 50, blurAmount 2,
 *   radius from the element's computed border-radius, scale = maxDisp * 0.8,
 *   filter attributes x/y/width/height in percentages, specular map bezel = safeBezel * 2.5,
 *   background = color-mix(in srgb, <bg var> bgOpacity%, transparent),
 *   backdrop-filter = url(#id) blur(2px).
 * Nothing is added on top: no white gradients, no extra shadows, no border rings.
 */

function squircleSurface(t: number): number {
  return Math.pow(1 - Math.pow(1 - t, 4), 0.25)
}

/** Snell-law refraction profile, exactly as in the plugin. */
function calculateRefractionProfile(
  glassThickness: number,
  bezelWidth: number,
  heightFn: (t: number) => number,
  ior: number,
  samples: number,
): Float64Array {
  const eta = 1 / ior
  const profile = new Float64Array(samples)
  for (let index = 0; index < samples; index += 1) {
    const x = index / samples
    const y = heightFn(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const y2 = heightFn(x + dx)
    const deriv = (y2 - y) / dx
    const mag = Math.sqrt(deriv * deriv + 1)
    const nx = -deriv / mag
    const ny = -1 / mag
    const dot = ny
    const k = 1 - eta * eta * (1 - dot * dot)
    if (k < 0) {
      profile[index] = 0
      continue
    }
    const sq = Math.sqrt(k)
    const rx = -(eta * dot + sq) * nx
    const ry = eta - (eta * dot + sq) * ny
    profile[index] = ry === 0 ? 0 : rx * ((y * bezelWidth + glassThickness) / ry)
  }
  return profile
}

function generateDisplacementMap(
  width: number,
  height: number,
  radius: number,
  bezelWidth: number,
  profile: Float64Array,
  maxDisp: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return ''
  const image = context.createImageData(width, height)
  const data = image.data
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 128
    data[index + 1] = 128
    data[index + 2] = 0
    data[index + 3] = 255
  }
  const r = Math.min(radius, Math.min(width, height) / 2 - 1)
  if (r <= 0) return canvas.toDataURL()
  const clampedBezel = Math.min(bezelWidth, r - 1)
  if (clampedBezel <= 1) return canvas.toDataURL()
  const rSq = r * r
  const r1Sq = (r + 1) * (r + 1)
  const rBSq = Math.max(r - clampedBezel, 0) * Math.max(r - clampedBezel, 0)
  const wB = width - r * 2
  const hB = height - r * 2
  const samples = profile.length
  if (wB < 0 || hB < 0) return canvas.toDataURL()

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let dx: number
      if (x < r) dx = x - r
      else if (x >= width - r) dx = x - r - wB
      else dx = 0
      let dy: number
      if (y < r) dy = y - r
      else if (y >= height - r) dy = y - r - hB
      else dy = 0
      const dSq = dx * dx + dy * dy
      if (dSq > r1Sq || dSq < rBSq) continue
      const dist = Math.sqrt(dSq)
      const fromSide = r - dist
      const opacity = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq))
      if (opacity <= 0 || dist === 0) continue
      const cos = dx / dist
      const sin = dy / dist
      const bin = Math.min(Math.floor((fromSide / clampedBezel) * samples), samples - 1)
      const disp = profile[bin] || 0
      const dX = (-cos * disp) / maxDisp
      const dY = (-sin * disp) / maxDisp
      const idx = (y * width + x) * 4
      data[idx] = Math.min(255, Math.max(0, (128 + dX * 127 * opacity + 0.5) | 0))
      data[idx + 1] = Math.min(255, Math.max(0, (128 + dY * 127 * opacity + 0.5) | 0))
    }
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

function generateSpecularMap(
  width: number,
  height: number,
  radius: number,
  bezelWidth: number,
  angle = Math.PI / 3,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return ''
  const image = context.createImageData(width, height)
  const data = image.data
  const r = Math.min(radius, Math.min(width, height) / 2 - 1)
  if (r <= 0) return canvas.toDataURL()
  const clampedBezel = Math.min(bezelWidth, r - 1)
  if (clampedBezel <= 1) return canvas.toDataURL()
  const rSq = r * r
  const r1Sq = (r + 1) * (r + 1)
  const rBSq = Math.max(r - clampedBezel, 0) * Math.max(r - clampedBezel, 0)
  const wB = width - r * 2
  const hB = height - r * 2
  const lightVec = [Math.cos(angle), Math.sin(angle)]

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let dx: number
      if (x < r) dx = x - r
      else if (x >= width - r) dx = x - r - wB
      else dx = 0
      let dy: number
      if (y < r) dy = y - r
      else if (y >= height - r) dy = y - r - hB
      else dy = 0
      const dSq = dx * dx + dy * dy
      if (dSq > r1Sq || dSq < rBSq) continue
      const dist = Math.sqrt(dSq)
      const fromSide = r - dist
      const opacity = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq))
      if (opacity <= 0 || dist === 0) continue
      const cos = dx / dist
      const sin = -dy / dist
      const dot = Math.abs(cos * lightVec[0] + sin * lightVec[1])
      const edge = Math.sqrt(Math.max(0, 1 - Math.pow(1 - fromSide, 2)))
      const coeff = dot * edge
      const col = (255 * coeff) | 0
      const alpha = Math.min(255, Math.max(0, (col * coeff * opacity * 0.85) | 0))
      const idx = (y * width + x) * 4
      data[idx] = col
      data[idx + 1] = col
      data[idx + 2] = col
      data[idx + 3] = alpha
    }
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

function buildSVGFilter(
  filterId: string,
  dispUrl: string,
  specUrl: string,
  scale: number,
  width: number,
  height: number,
  specOpacity: number,
): string {
  let fc = ''
  fc += `<feImage href="${dispUrl}" x="0" y="0" width="${width}" height="${height}" result="disp_map" />`
  fc += `<feDisplacementMap in="SourceGraphic" in2="disp_map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="displaced" />`
  if (specUrl !== '') {
    fc += `<feImage href="${specUrl}" x="0" y="0" width="${width}" height="${height}" result="spec_layer" />`
    fc += '<feComposite in="displaced" in2="spec_layer" operator="in" result="spec_masked" />'
    fc += `<feComponentTransfer in="spec_layer" result="spec_faded"><feFuncA type="linear" slope="${specOpacity}" /></feComponentTransfer>`
    fc += '<feBlend in="spec_masked" in2="displaced" mode="screen" result="with_spec" />'
    fc += '<feBlend in="spec_faded" in2="with_spec" mode="screen" />'
  }
  return fc
}

export interface LiquidGlassOptions {
  /** Glass thickness for the Snell profile. */
  thickness?: number
  /** Width of the refracting bezel, px. */
  bezelWidth?: number
  /** Index of refraction. */
  ior?: number
  /** Rim highlight strength (0 disables the specular pass). */
  specularOpacity?: number
  /** Width of the specular band in px; defaults to the plugin's safeBezel * 2.5. */
  specularBezel?: number
  /** Background opacity in percent, mixed against the theme background. */
  bgOpacity?: number
  /** Extra blur appended to the backdrop filter. */
  blurAmount?: number
  /** CSS variable holding the background colour to mix against. */
  bgVar?: string
}

const BASE_ID = 'dsh-talk-map-liquid-glass'
let instanceSeq = 0

function supportsRefraction(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('backdrop-filter', `url(#${BASE_ID})`) || CSS.supports('-webkit-backdrop-filter', `url(#${BASE_ID})`)
}

export function installLiquidGlass(element: HTMLElement, options: LiquidGlassOptions = {}): () => void {
  const thickness = options.thickness ?? 100
  const bezelWidth = options.bezelWidth ?? 40
  const ior = options.ior ?? 2.5
  const specularOpacity = options.specularOpacity ?? 0.5
  const bgOpacity = options.bgOpacity ?? 0
  // The plugin ships blurAmount: 2; the user wants pure refraction, so no blur at all.
  const blurAmount = options.blurAmount ?? 0
  const bgVar = options.bgVar ?? '--dsw-alias-bg-base'
  const specularBezel = options.specularBezel

  instanceSeq += 1
  const filterId = `${BASE_ID}-${instanceSeq}`

  if (!supportsRefraction()) {
    element.style.setProperty('backdrop-filter', `blur(${blurAmount.toFixed(1)}px)`, 'important')
    return () => {
      element.style.removeProperty('backdrop-filter')
      element.style.removeProperty('-webkit-backdrop-filter')
    }
  }

  // Same as the plugin: the element owns the SVG definition.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('style', 'position:absolute;overflow:hidden;pointer-events:none')
  svg.setAttribute('color-interpolation-filters', 'sRGB')
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.append(defs)
  document.body.append(svg)

  let timer: ReturnType<typeof setTimeout> | undefined

  const writeFilter = (markup: string): void => {
    const old = defs.querySelector(`#${filterId}`)
    old?.remove()
    if (markup === '') return
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    filter.setAttribute('id', filterId)
    filter.setAttribute('x', '0%')
    filter.setAttribute('y', '0%')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.innerHTML = markup
    defs.append(filter)
  }

  const applyBackdropFilter = (): void => {
    const filters = [`url(#${filterId})`]
    if (blurAmount > 0.5) filters.push(`blur(${blurAmount.toFixed(1)}px)`)
    element.style.setProperty('backdrop-filter', filters.join(' '), 'important')
    element.style.setProperty('-webkit-backdrop-filter', filters.join(' '), 'important')
  }

  const rebuild = (): void => {
    const width = element.offsetWidth
    const height = element.offsetHeight
    if (width < 4 || height < 4) return
    const style = getComputedStyle(element)
    // The plugin reads parseFloat(borderRadius); our panel is "0 20px 20px 0", so take the
    // largest corner instead of the first token.
    const corners = style.borderRadius.split(/\s+/).map(value => Number.parseFloat(value) || 0)
    const cssRadius = Math.max(...corners) || 0
    const radius = Math.min(cssRadius, width / 2, height / 2)
    const safeBezel = Math.min(bezelWidth, radius - 1, Math.min(width, height) / 2 - 1)
    if (safeBezel <= 1) {
      writeFilter('')
      return
    }
    const profile = calculateRefractionProfile(thickness, safeBezel, squircleSurface, ior, 128)
    const maxDisp = Math.max(...Array.from(profile).map(Math.abs)) || 1
    const scale = maxDisp * 0.8
    const dispUrl = generateDisplacementMap(width, height, radius, safeBezel, profile, maxDisp)
    const specBand = specularBezel ?? safeBezel * 2.5
    const specUrl = specularOpacity > 0.001 ? generateSpecularMap(width, height, radius, specBand) : ''
    writeFilter(buildSVGFilter(filterId, dispUrl, specUrl, scale, width, height, specularOpacity))
  }

  const schedule = (): void => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      rebuild()
      applyBackdropFilter()
    }, 50)
  }

  element.style.setProperty('background', `color-mix(in srgb, var(${bgVar}) ${bgOpacity}%, transparent)`, 'important')
  rebuild()
  applyBackdropFilter()

  const observer = new ResizeObserver(schedule)
  observer.observe(element)

  return () => {
    observer.disconnect()
    clearTimeout(timer)
    svg.remove()
    element.style.removeProperty('backdrop-filter')
    element.style.removeProperty('-webkit-backdrop-filter')
    element.style.removeProperty('background')
  }
}
