/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰白静态虚线。
 * 同步中 → 灰白静态实线，一层光沿着线扫过去。
 *
 * 这层光直接**复用卡片运行光环的剖面**：卡片用的是 conic gradient
 *   190° 0 → 250° 0.18 → 292° 0.55 → 325° 1.0 → 352° 0.4 → 360° 0
 * 一条 47% 宽的软带（大半圈是暗的、缓慢爬升、末段一个亮尖、然后急落），以
 * 恒定速度扫过。线上没有极坐标，于是把同一条剖面做成**一扇渐变的窗口**，
 * 沿线的长轴平移：窗口外遮罩全黑，所以任意时刻只有一处亮，不会出现
 * dash 在接缝处"复制"成两段的问题。
 *
 * 线本身是 SVG path，所以窗口扫过时，光自然被裁在线身里、拐角也是圆的。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
}

/** One sweep across the line, in seconds (the card ring takes 1.8s per lap). */
const SWEEP_S = 3.6

/**
 * Brightness profile across the band, as fractions → opacity.
 *
 * Symmetric on purpose. The card ring is a CLOSED loop, so its gradient can ramp
 * up to a sharp peak and cut — there is no "head", the dark side simply joins the
 * bright side again. A line is open, so that same profile reads as a comet with a
 * nose. Fading at BOTH ends keeps the card's look: a soft mass of light sliding
 * along, brightest in the middle, nothing that looks like a nose.
 */
const LIGHT_PROFILE: [number, number][] = [
  [0, 0],
  [0.16, 0.1],
  [0.34, 0.38],
  [0.5, 0.92],
  [0.66, 0.38],
  [0.84, 0.1],
  [1, 0],
]

/** Stable hash → per-edge phase, so parallel lines don't sweep in lockstep. */
function hashOf(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

/** How many sparks drift along the line, and how long one pass takes. */
const SPARKS = 9
const SPARK_S = 2.6

/** Deterministic 0..1 noise, so a re-render never reshuffles the sparks. */
function noise(seed: number, salt: number): number {
  let value = (seed + salt * 2654435761) >>> 0
  value ^= value << 13
  value >>>= 0
  value ^= value >> 17
  value ^= value << 5
  value >>>= 0
  return value / 4294967296
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function TalkMapEdge(props: EdgeProps): React.JSX.Element {
  const data = (props.data ?? {}) as TalkMapEdgeData
  const synced = data.sync === 'synced'
  const [path] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })

  const uid = safeId(props.id ?? 'edge')
  const rampId = 'tmp' + uid
  const clipId = 'tmc' + uid
  const sparkId = 'tms' + uid
  // Invisible geometry the sparks ride on (the sweep uses a mask instead).
  const routeId = 'tmr' + uid
  const phase = -((hashOf(props.id ?? '') % 1000) / 1000) * SWEEP_S

  // Small glowing motes drifting the same way as the sweep: the line keeps a
  // sense of movement even between two passes of the big light.
  const seed = hashOf(props.id ?? 'edge')
  const sparks = Array.from({ length: SPARKS }, (_, index) => ({
    dur: SPARK_S * (0.85 + 0.3 * noise(seed, index + 1)),
    begin: -((index / SPARKS) * SPARK_S + noise(seed, index + 11) * 0.4),
    r: 2 + 2 * noise(seed, index + 21),
    opacity: 0.5 + 0.45 * noise(seed, index + 31),
    blur: 0.3 + 0.6 * noise(seed, index + 41),
  }))
  const flying = synced && !prefersReducedMotion()

  // Sweep along the dominant axis. A smoothstep path runs horizontally and
  // vertically, so whichever axis is longer is the direction the light travels.
  const dx = Math.abs(props.targetX - props.sourceX)
  const dy = Math.abs(props.targetY - props.sourceY)
  const horizontal = dx >= dy
  const span = Math.max(1, horizontal ? dx : dy)
  /** Width of the lit band ≈ the card's 47%, with sane bounds for tiny edges. */
  const band = Math.max(140, Math.min(460, span * 0.5))
  const origin = horizontal
    ? Math.min(props.sourceX, props.targetX)
    : Math.min(props.sourceY, props.targetY)

  const pad = 80
  const minX = Math.min(props.sourceX, props.targetX) - pad - (horizontal ? band : 0)
  const minY = Math.min(props.sourceY, props.targetY) - pad - (horizontal ? 0 : band)
  const maskW = dx + pad * 2 + (horizontal ? band * 2 : 0)
  const maskH = dy + pad * 2 + (horizontal ? 0 : band * 2)
  const travel = span + band

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        {...(props.markerEnd !== undefined ? { markerEnd: props.markerEnd } : {})}
        style={{
          // Both states are dashed now: the light alone says which is which.
          stroke: synced ? 'rgba(226, 232, 242, 0.55)' : 'rgba(200, 206, 216, 0.34)',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeDasharray: '6 5',
        }}
      />

      {flying
        ? (
            <>
              <defs>
                <radialGradient id={sparkId}>
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.98)" />
                  <stop offset="45%" stopColor="rgba(214, 232, 255, 0.5)" />
                  <stop offset="100%" stopColor="rgba(190, 214, 255, 0)" />
                </radialGradient>
                {/* The aura's profile, as a window gradient. */}
                <linearGradient
                  id={rampId}
                  x1="0"
                  y1="0"
                  x2={horizontal ? '1' : '0'}
                  y2={horizontal ? '0' : '1'}
                >
                  {LIGHT_PROFILE.map(([at, opacity]) => (
                    <stop
                      key={at}
                      offset={`${(at * 100).toFixed(1)}%`}
                      stopColor="#fff"
                      stopOpacity={opacity}
                    />
                  ))}
                </linearGradient>
                {/* One window: outside it the mask is black, so only one place
                    on the line is ever lit. */}
                <mask
                  id={clipId}
                  maskUnits="userSpaceOnUse"
                  x={minX}
                  y={minY}
                  width={maskW}
                  height={maskH}
                >
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from={horizontal ? `${-band} 0` : `0 ${-band}`}
                      to={horizontal ? `${travel} 0` : `0 ${travel}`}
                      dur={`${SWEEP_S}s`}
                      begin={`${phase}s`}
                      repeatCount="indefinite"
                    />
                    <rect
                      x={horizontal ? origin : minX}
                      y={horizontal ? minY : origin}
                      width={horizontal ? band : maskW}
                      height={horizontal ? maskH : band}
                      fill={`url(#${rampId})`}
                    />
                  </g>

                </mask>
              </defs>

              {/* Invisible: only a route for the sparks. */}
              <path id={routeId} d={path} fill="none" stroke="none" />

              <g mask={`url(#${clipId})`} style={{ pointerEvents: 'none' }}>
                {/* Glow first, then the crisp line of light on top. */}
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(190, 214, 255, 0.7)"
                  strokeWidth={10}
                  strokeLinecap="round"
                  style={{ filter: 'blur(5px)' }}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.95)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  style={{ filter: 'blur(0.7px)' }}
                />
              </g>
                {/* Sparks live OUTSIDE the sweep mask: they drift along the
                    whole line, not only inside the lit window. */}
                {/* Sparks: they ride the same path, so they stay on the line and
                    turn the corners with it. */}
                {sparks.map((spark, index) => (
                  <circle
                    key={'spark' + index}
                    r={spark.r}
                    fill={`url(#${sparkId})`}
                    opacity={spark.opacity}
                    style={{ filter: `blur(${spark.blur}px)` }}
                  >
                    <animateMotion
                      dur={`${spark.dur}s`}
                      begin={`${spark.begin}s`}
                      repeatCount="indefinite"
                      rotate="auto"
                    >
                      <mpath href={`#${routeId}`} xlinkHref={`#${routeId}`} />
                    </animateMotion>
                  </circle>
                ))}
            </>
          )
        : null}
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
