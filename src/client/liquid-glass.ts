/**
 * Liquid-glass refraction for the map rail, ported from EchoMusic's `echo-liquid-glass`
 * (MIT, which itself follows archisvaze/liquid-glass).
 *
 * The technique: build a Snell-law refraction profile, bake it into a displacement map on a
 * canvas, feed it to an SVG `feDisplacementMap`, and use that filter as the element's
 * `backdrop-filter`. The backdrop behind the panel is therefore genuinely bent along the
 * bezel instead of just being blurred, which is what made the earlier attempts look flat.
 */

/** Squircle height profile (Superellipse, n = 4). */
function squircleSurface(t: number): number {
  return Math.pow(1 - Math.pow(1 - t, 4), 0.25)
}

/** Snell-law displacement per sample, normalised to [-1, 1] by the caller. */
function refractionProfile(thickness: number, bezelWidth: number, ior: number, samples = 128): Float64Array {
  const eta = 1 / ior
  const profile = new Float64Array(samples)
  for (let index = 0; index < samples; index += 1) {
    const x = index / samples
    const y = squircleSurface(x)
    const dx = x < 1 ? 0.0001 : -0.0001
    const slope = (squircleSurface(x + dx) - y) / dx
    const magnitude = Math.sqrt(slope * slope + 1)
    const nx = -slope / magnitude
    const ny = -1 / magnitude
    const k = 1 - eta * eta * (1 - ny * ny)
    if (k < 0) {
      profile[index] = 0
      continue
    }
    const sq = Math.sqrt(k)
    const rx = -(eta * ny + sq) * nx
    const ry = eta - (eta * ny + sq) * ny
    profile[index] = ry === 0 ? 0 : rx * ((y * bezelWidth + thickness) / ry)
  }
  return profile
}

interface MapGeometry {
  width: number
  height: number
  radius: number
  bezel: number
}

/** R/G hold the displacement vector, A is fully opaque so the filter has data everywhere. */
function displacementMap(geometry: MapGeometry, profile: Float64Array): string {
  const { width, height, radius, bezel } = geometry
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
  const clampedBezel = Math.min(bezel, r - 1)
  if (clampedBezel <= 1) return canvas.toDataURL()

  const rSq = r * r
  const r1Sq = (r + 1) * (r + 1)
  const inner = Math.max(r - clampedBezel, 0)
  const rBSq = inner * inner
  const straightW = width - r * 2
  const straightH = height - r * 2
  const samples = profile.length
  if (straightW < 0 || straightH < 0) return canvas.toDataURL()

  let maxDisp = 1
  for (let index = 0; index < samples; index += 1) maxDisp = Math.max(maxDisp, Math.abs(profile[index]))

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let dx: number
      if (x < r) dx = x - r
      else if (x >= width - r) dx = x - r - straightW
      else dx = 0
      let dy: number
      if (y < r) dy = y - r
      else if (y >= height - r) dy = y - r - straightH
      else dy = 0

      const distanceSq = dx * dx + dy * dy
      if (distanceSq > r1Sq || distanceSq < rBSq) continue
      const distance = Math.sqrt(distanceSq)
      const fromSide = r - distance
      const opacity = distanceSq < rSq ? 1 : 1 - (distance - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq))
      if (opacity <= 0 || distance === 0) continue

      const cos = dx / distance
      const sin = dy / distance
      const bin = Math.min(Math.floor((fromSide / clampedBezel) * samples), samples - 1)
      const displacement = profile[bin] || 0
      const offsetX = (-cos * displacement) / maxDisp
      const offsetY = (-sin * displacement) / maxDisp
      const pixel = (y * width + x) * 4
      data[pixel] = Math.min(255, Math.max(0, (128 + offsetX * 127 * opacity + 0.5) | 0))
      data[pixel + 1] = Math.min(255, Math.max(0, (128 + offsetY * 127 * opacity + 0.5) | 0))
    }
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

/** Highlight band that rides the same bezel, so the rim catches "light". */
function specularMap(geometry: MapGeometry, angle = Math.PI / 3): string {
  const { width, height, radius, bezel } = geometry
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return ''
  const image = context.createImageData(width, height)
  const data = image.data

  const r = Math.min(radius, Math.min(width, height) / 2 - 1)
  if (r <= 0) return canvas.toDataURL()
  const clampedBezel = Math.min(bezel, r - 1)
  if (clampedBezel <= 1) return canvas.toDataURL()

  const rSq = r * r
  const r1Sq = (r + 1) * (r + 1)
  const inner = Math.max(r - clampedBezel, 0)
  const rBSq = inner * inner
  const straightW = width - r * 2
  const straightH = height - r * 2
  const lightX = Math.cos(angle)
  const lightY = Math.sin(angle)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let dx: number
      if (x < r) dx = x - r
      else if (x >= width - r) dx = x - r - straightW
      else dx = 0
      let dy: number
      if (y < r) dy = y - r
      else if (y >= height - r) dy = y - r - straightH
      else dy = 0

      const distanceSq = dx * dx + dy * dy
      if (distanceSq > r1Sq || distanceSq < rBSq) continue
      const distance = Math.sqrt(distanceSq)
      const fromSide = r - distance
      const opacity = distanceSq < rSq ? 1 : 1 - (distance - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq))
      if (opacity <= 0 || distance === 0) continue

      const cos = dx / distance
      const sin = -dy / distance
      const dot = Math.abs(cos * lightX + sin * lightY)
      const edge = Math.sqrt(Math.max(0, 1 - Math.pow(1 - fromSide, 2)))
      const coefficient = dot * edge
      const value = (255 * coefficient) | 0
      const alpha = Math.min(255, Math.max(0, (value * coefficient * opacity * 0.85) | 0))
      const pixel = (y * width + x) * 4
      data[pixel] = value
      data[pixel + 1] = value
      data[pixel + 2] = value
      data[pixel + 3] = alpha
    }
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

function filterMarkup(id: string, geometry: MapGeometry, displacementUrl: string, specularUrl: string, scale: number, specularOpacity: number): string {
  const { width, height } = geometry
  const parts = [
    `<filter id="${id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`,
    `<feImage href="${displacementUrl}" x="0" y="0" width="${width}" height="${height}" result="disp" preserveAspectRatio="none"/>`,
    `<feDisplacementMap in="SourceGraphic" in2="disp" scale="${scale.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="bent"/>`,
  ]
  if (specularUrl !== '') {
    parts.push(
      `<feImage href="${specularUrl}" x="0" y="0" width="${width}" height="${height}" result="spec" preserveAspectRatio="none"/>`,
      `<feComposite in="bent" in2="spec" operator="in" result="specMasked"/>`,
      `<feComponentTransfer in="spec" result="specFaded"><feFuncA type="linear" slope="${specularOpacity.toFixed(2)}"/></feComponentTransfer>`,
      `<feBlend in="specMasked" in2="bent" mode="screen" result="withSpec"/>`,
      `<feBlend in="specFaded" in2="withSpec" mode="screen"/>`,
    )
  } else {
    parts.push('<feBlend in="bent" in2="bent" mode="normal"/>')
  }
  parts.push('</filter>')
  return parts.join('')
}

export interface LiquidGlassOptions {
  /** Corner radius of the glass, in px. */
  radius?: number
  /** Refracting band width along the edge, in px. */
  bezel?: number
  /** Glass thickness used by the Snell profile. */
  thickness?: number
  /** Index of refraction; 2.2–2.6 reads as glass, higher bends harder. */
  ior?: number
  /** How many px the backdrop is displaced at the edge. */
  scale?: number
  /** Rim highlight strength, 0 disables it. */
  specular?: number
  /** Extra blur layered on top of the refraction. */
  blur?: number
}

const BASE_ID = 'dsh-talk-map-liquid-glass'
/** Each install gets its own id: sharing one made the later filter shadow the earlier one. */
let instanceSeq = 0

function supportsRefraction(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('backdrop-filter', `url(#${BASE_ID})`) || CSS.supports('-webkit-backdrop-filter', `url(#${BASE_ID})`)
}

/**
 * Applies the refraction filter to one element and keeps it in sync with its size.
 * Returns a disposer. When the engine is unsupported the element keeps a plain blur.
 */
export function installLiquidGlass(element: HTMLElement, options: LiquidGlassOptions = {}): () => void {
  const radius = options.radius ?? 22
  const bezel = options.bezel ?? 26
  const thickness = options.thickness ?? 90
  const ior = options.ior ?? 2.4
  const scale = options.scale ?? 58
  const specular = options.specular ?? 0.42
  const blur = options.blur ?? 0

  if (!supportsRefraction()) {
    element.style.setProperty('backdrop-filter', 'blur(14px) saturate(1.6)')
    element.style.setProperty('-webkit-backdrop-filter', 'blur(14px) saturate(1.6)')
    return () => {
      element.style.removeProperty('backdrop-filter')
      element.style.removeProperty('-webkit-backdrop-filter')
    }
  }

  instanceSeq += 1
  const filterId = `${BASE_ID}-${instanceSeq}`
  const svgId = `${BASE_ID}-svg-${instanceSeq}`

  let svg: SVGSVGElement | undefined
  let frame = 0

  const disposeSvg = (): void => {
    svg?.remove()
    svg = undefined
  }

  const rebuild = (): void => {
    const rect = element.getBoundingClientRect()
    const width = Math.max(2, Math.round(rect.width))
    const height = Math.max(2, Math.round(rect.height))
    if (width < 8 || height < 8) return

    const geometry: MapGeometry = { width, height, radius, bezel }
    const profile = refractionProfile(thickness, bezel, ior)
    const displacementUrl = displacementMap(geometry, profile)
    if (displacementUrl === '') return
    const specularUrl = specular > 0 ? specularMap(geometry) : ''

    disposeSvg()
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('id', svgId)
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('style', 'position:absolute;overflow:hidden;pointer-events:none')
    svg.setAttribute('color-interpolation-filters', 'sRGB')
    svg.innerHTML = `<defs>${filterMarkup(filterId, geometry, displacementUrl, specularUrl, scale, specular)}</defs>`
    document.body.append(svg)

    const filters = [`url(#${filterId})`]
    if (blur > 0.5) filters.push(`blur(${blur.toFixed(1)}px)`)
    element.style.setProperty('backdrop-filter', filters.join(' '))
    element.style.setProperty('-webkit-backdrop-filter', filters.join(' '))
  }

  const schedule = (): void => {
    if (frame !== 0) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = 0
      rebuild()
    })
  }

  const observer = new ResizeObserver(schedule)
  observer.observe(element)
  rebuild()

  return () => {
    observer.disconnect()
    if (frame !== 0) cancelAnimationFrame(frame)
    disposeSvg()
    element.style.removeProperty('backdrop-filter')
    element.style.removeProperty('-webkit-backdrop-filter')
  }
}

export interface GlowOptions {
  /** Colour of the glow; defaults to white. */
  color?: string
  /** Radius of the soft radial fill. */
  radius?: number
  /** Radius of the border-light mask (HarmonyOS style). */
  borderRadius?: number
}

/**
 * HarmonyOS-style cursor glow, ported from echo-liquid-glass: a radial fill plus a masked
 * 2px inner border, both following the pointer through `--glow-x` / `--glow-y`.
 */
export function installGlow(element: HTMLElement, options: GlowOptions = {}): () => void {
  element.setAttribute('data-liquid-glow', '1')
  element.style.setProperty('--glow-color', options.color ?? 'rgba(255, 255, 255, 0.95)')
  element.style.setProperty('--glow-radius', `${options.radius ?? 170}px`)
  element.style.setProperty('--border-glow-radius', `${options.borderRadius ?? 120}px`)

  let frame = 0
  const onMove = (event: PointerEvent): void => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const rect = element.getBoundingClientRect()
      element.style.setProperty('--glow-x', `${event.clientX - rect.left}px`)
      element.style.setProperty('--glow-y', `${event.clientY - rect.top}px`)
    })
  }
  element.addEventListener('pointermove', onMove, { passive: true })

  return () => {
    element.removeEventListener('pointermove', onMove)
    if (frame !== 0) cancelAnimationFrame(frame)
    element.removeAttribute('data-liquid-glow')
    for (const name of ['--glow-color', '--glow-radius', '--border-glow-radius', '--glow-x', '--glow-y']) {
      element.style.removeProperty(name)
    }
  }
}
