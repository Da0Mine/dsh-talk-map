/**
 * Workspace frame: the folder a group of cards lives in.
 *
 * Geometry is the user's: drag the label chip (or any border strip) to move the
 * whole folder, drag the right / bottom / corner handle to resize it. The cards
 * inside are laid out by grid-layout.ts, so a resize reflows them live — the
 * frame reports every candidate rect through `data.onResizeStart` and the canvas
 * decides what to persist.
 *
 * The body centre stays pointer-transparent (pan and double-click pass through
 * to the pane, which is how "double-click inside a folder = new chat here"
 * works without the frame swallowing the gesture).
 */
import type { NodeProps, Node } from '@xyflow/react'
import type { FrameGeometry } from '../shared/model.ts'
import { colorOf } from './colors.ts'
import styles from './talk-map.module.css'

export type ResizeAxis = 'e' | 's' | 'se'

export interface WsFrameData extends Record<string, unknown> {
  workspaceId: string
  title: string
  count: number
  width: number
  height: number
  colorTag?: string
  /** Pointer-down on a resize handle; the canvas owns the pointer capture. */
  onResizeStart?: (axis: ResizeAxis, event: React.PointerEvent<HTMLDivElement>) => void
}

export type WsFrameNodeType = Node<WsFrameData, 'wsFrame'>

const EDGE = 10
/** Size of the diagonal corner handle; the edge strips stop short of it. */
const CORNER = 26

export function WsFrameNode(props: NodeProps<WsFrameNodeType>): React.JSX.Element {
  const { data, selected } = props
  const color = colorOf(data.colorTag)
  const start = (axis: ResizeAxis) => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    data.onResizeStart?.(axis, event)
  }
  return (
    <div
      className={`${styles['wsFrame']}${selected === true ? ` ${styles['wsFrameSelected']}` : ''}`}
      style={{
        width: data.width,
        height: data.height,
        ...(color !== undefined ? { borderColor: color.border, background: color.faint } : {}),
      }}
      data-talkmap-frame=""
      data-talkmap-workspace={data.workspaceId}
    >
      <div
        className={styles['wsFrameLabel']}
        style={color !== undefined
          ? { borderColor: color.border, backgroundImage: `linear-gradient(${color.fill}, ${color.fill})` }
          : {}}
      >
        {data.title}
        <span className={styles['wsFrameCount']}>{data.count}</span>
      </div>
      {/* border strips: clickable/draggable surfaces along the dashed edge */}
      <div className={styles['wsFrameEdge']} style={{ top: 0, left: 0, right: 0, height: EDGE }} />
      <div className={styles['wsFrameEdge']} style={{ bottom: 0, left: 0, right: 0, height: EDGE }} />
      <div className={styles['wsFrameEdge']} style={{ top: 0, bottom: 0, left: 0, width: EDGE }} />
      <div className={styles['wsFrameEdge']} style={{ top: 0, bottom: 0, right: 0, width: EDGE }} />
      {/* resize handles: the folder's own edges, like a desktop folder.
        * The last CORNER px of each strip belongs to the corner handle, so the
        * diagonal gesture can never be swallowed by a single-axis edge. */}
      <div
        className={`${styles['wsFrameResize']} ${styles['wsFrameResizeE']}`}
        style={{ top: EDGE, bottom: CORNER + 2, right: -3, width: 12 }}
        onPointerDown={start('e')}
        title="拖拽改变宽度"
      />
      <div
        className={`${styles['wsFrameResize']} ${styles['wsFrameResizeS']}`}
        style={{ left: EDGE, right: CORNER + 2, bottom: -3, height: 12 }}
        onPointerDown={start('s')}
        title="拖拽改变高度"
      />
      <div
        className={`${styles['wsFrameResize']} ${styles['wsFrameResizeCorner']}`}
        onPointerDown={start('se')}
        title="拖拽同时改变宽高"
      />
    </div>
  )
}

export type { FrameGeometry }
