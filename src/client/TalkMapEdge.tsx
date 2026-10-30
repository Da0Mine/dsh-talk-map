/**
 * One edge renderer for the whole map.
 *
 * 未同步 → 灰白静态虚线。
 * 同步中 → 灰白静态实线，一枚**彗星**沿路径跑：亮头在前，尾巴沿渐变淡掉，
 * 外圈一层柔光。头圆尾细、整组随切线转动，并且被**裁剪在线身之内**——所以它
 * 不会在拐角处戳出线外，读起来就是"光在管子里流"，不是"色块平移"。
 *
 * 为什么不用 stroke-dasharray：等宽 dash 无论怎么模糊都是一条亮度均匀的带子，
 * 没有形状变化。这里用形状（尾形 + 亮头 + 光晕）+ 沿长轴渐变来造光，用
 * animateMotion + rotate=auto 让它贴着曲线走，再用一个把路径描粗的 mask 兜底。
 */
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export interface TalkMapEdgeData {
  fromCardId?: string
  toCardId?: string
  sync?: 'synced' | 'idle'
}

/** One full traversal of the line, in seconds. */
const FLOW_S = 2.8

/** How wide the corridor is that the light is clipped into. */
const CORRIDOR = 16

/** Stable hash → per-edge phase, so parallel lines don't fly in lockstep. */
function hashOf(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** SVG ids must be unique per edge and safe inside url(#…). */
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
  const routeId = 'tmr' + uid
  const rampId = 'tmp' + uid
  const bloomId = 'tmb' + uid
  const clipId = 'tmc' + uid
  const phase = -((hashOf(props.id ?? '') % 1000) / 1000) * FLOW_S
  const flying = synced && !prefersReducedMotion()

  // A smoothstep path never leaves the box spanned by its endpoints, so the
  // corridor mask only has to cover that box plus the corner radius.
  const boxX = Math.min(props.sourceX, props.targetX) - 40
  const boxY = Math.min(props.sourceY, props.targetY) - 40
  const boxW = Math.abs(props.sourceX - props.targetX) + 80
  const boxH = Math.abs(props.sourceY - props.targetY) + 80

  /** Ride the path nose-first, fading in on departure and out on arrival. */
  const ride = (suffix: string): React.JSX.Element => (
    <>
      <animateMotion
        key={'m' + suffix}
        dur={`${FLOW_S}s`}
        begin={`${phase}s`}
        repeatCount="indefinite"
        rotate="auto"
        calcMode="spline"
        keyTimes="0;1"
        keyPoints="0;1"
        keySplines="0.4 0 0.55 1"
      >
        {/* Both spellings: SMIL mpath historically honoured only xlink:href. */}
        <mpath href={`#${routeId}`} xlinkHref={`#${routeId}`} />
      </animateMotion>
      <animate
        key={'o' + suffix}
        attributeName="opacity"
        dur={`${FLOW_S}s`}
        begin={`${phase}s`}
        repeatCount="indefinite"
        values="0;1;1;0"
        keyTimes="0;0.08;0.9;1"
      />
    </>
  )

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        {...(props.markerEnd !== undefined ? { markerEnd: props.markerEnd } : {})}
        style={{
          // Grey-white either way: only the dash pattern and the light change.
          stroke: synced ? 'rgba(226, 232, 242, 0.6)' : 'rgba(200, 206, 216, 0.34)',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          ...(synced ? {} : { strokeDasharray: '6 5' }),
        }}
      />

      {flying
        ? (
            <>
              <defs>
                {/* Along-the-body ramp: clear at the tail, white at the head. */}
                <linearGradient id={rampId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(186, 210, 255, 0)" />
                  <stop offset="38%" stopColor="rgba(198, 220, 255, 0.22)" />
                  <stop offset="72%" stopColor="rgba(230, 240, 255, 0.62)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.96)" />
                </linearGradient>
                <radialGradient id={bloomId}>
                  <stop offset="0%" stopColor="rgba(224, 238, 255, 0.55)" />
                  <stop offset="55%" stopColor="rgba(196, 218, 255, 0.18)" />
                  <stop offset="100%" stopColor="rgba(190, 214, 255, 0)" />
                </radialGradient>
                {/* The corridor: everything outside the line is cut away, which is
                    what keeps the tail from poking off a corner. */}
                <mask
                  id={clipId}
                  maskUnits="userSpaceOnUse"
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={CORRIDOR}
                    strokeLinecap="round"
                  />
                </mask>
              </defs>

              {/* Motion route: invisible, only geometry. */}
              <path id={routeId} d={path} fill="none" stroke="none" />

              <g mask={`url(#${clipId})`}>
                {/* The light itself: tail + body + head, all nose-first. */}
                <g style={{ filter: 'blur(0.8px)', pointerEvents: 'none' }}>
                  {ride('body')}
                  <path
                    d="M0 -1.4 C -30 -3.6, -70 -5.2, -126 -4.2 C -132 -1.4, -132 1.4, -126 4.2 C -70 5.2, -30 3.6, 0 1.4 Z"
                    fill={`url(#${rampId})`}
                    opacity={0.75}
                  />
                  <ellipse rx={34} ry={3.4} fill={`url(#${rampId})`} opacity={0.9} />
                  <ellipse rx={10} ry={4.2} fill="rgba(255, 255, 255, 0.5)" />
                  <ellipse rx={5.5} ry={3.4} fill="rgba(255, 255, 255, 0.98)" />
                </g>

                {/* Bloom: wider and softer, centred on the head. */}
                <g style={{ filter: 'blur(6px)', pointerEvents: 'none' }}>
                  {ride('bloom')}
                  <ellipse rx={22} ry={12} fill={`url(#${bloomId})`} />
                  <ellipse cx={-40} rx={26} ry={7} fill={`url(#${bloomId})`} opacity={0.55} />
                </g>
              </g>
            </>
          )
        : null}
    </>
  )
}

export const edgeTypes = { talkMap: TalkMapEdge }
