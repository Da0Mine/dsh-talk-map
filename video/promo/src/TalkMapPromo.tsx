/**
 * dsh-talk-map 介绍视频 — 时间线与镜头。
 *
 * 视觉 tokens 全部取自插件本身（talk-map.module.css）：
 *   背景 #16181d / 卡片 #23262d / 正文 #cfd6e3 / 高亮 #ffd66a / 点阵网格
 *   字体 system-ui —— 全片不引入任何外部"宣传片皮肤"。
 * 动效性格：精致高端 ~48f，bezier(0.4,0,0.6,1)，过冲 ≤1.02，无 squash。
 */
import { Composition, Audio, Sequence, AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion'
import React from 'react'

/* ---------- 设计 tokens（源自插件样式表） ---------- */
const C = {
  bg: '#16181d',
  card: '#23262d',
  border: '#333a45',
  text: '#cfd6e3',
  dim: '#8b93a3',
  accent: '#ffd66a',
  glow: 'rgba(190, 214, 255, 0.55)',
}
const FONT = 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif'
const EASE = Easing.bezier(0.4, 0, 0.6, 1)

/* ---------- 帧级时间轴（30fps） ---------- */
const SHOTS = {
  intro: { from: 0, duration: 150 }, // 0–5s   标题
  board: { from: 150, duration: 210 }, // 5–12s  全景 + 推近
  drawer: { from: 360, duration: 180 }, // 12–18s 堆叠抽屉
  search: { from: 540, duration: 150 }, // 18–23s 全局搜索
  lamp: { from: 690, duration: 150 }, // 23–28s 状态光环
  outro: { from: 840, duration: 180 }, // 28–34s 收尾
}
const FPS = 30
export const TOTAL = SHOTS.outro.from + SHOTS.outro.duration

/* ---------- 通用零件 ---------- */

/** 点阵网格背景（复刻画布的点阵） */
const DotGrid: React.FC = () => {
  const frame = useCurrentFrame()
  const drift = frame * 0.12
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.bg,
        backgroundImage: 'radial-gradient(circle, #262b33 1.1px, transparent 1.1px)',
        backgroundSize: '22px 22px',
        backgroundPosition: `${-drift}px ${-drift * 0.4}px`,
      }}
    />
  )
}

/** 中文解说字幕（底部，逐段淡入） */
const Caption: React.FC<{ text: string; from: number; duration: number }> = ({ text, from, duration }) => {
  const frame = useCurrentFrame()
  const local = frame - from
  if (local < 0 || local > duration) return null
  const opacity = interpolate(local, [0, 12, duration - 12, duration], [0, 1, 1, 0], { easing: EASE })
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 64,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: 40,
          fontWeight: 600,
          color: '#eef2f9',
          background: 'rgba(22, 24, 29, 0.72)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '14px 34px',
          letterSpacing: 2,
          backdropFilter: 'blur(8px)',
        }}
      >
        {text}
      </span>
    </div>
  )
}

/** 2.5D 页面相机：对真实截图做推拉/平移（CSS zoom 级，保文字锐度） */
const PageCam: React.FC<{
  src: string
  from: number
  pan?: [number, number, number, number] // [x%, y%, zoomFrom, zoomTo]
  children?: React.ReactNode
}> = ({ src, from, pan = [50, 50, 1, 1], children }) => {
  const frame = useCurrentFrame()
  const local = frame - from
  const [cx, cy, z0, z1] = pan
  const zoom = interpolate(local, [0, 90, 9999], [z0, z1, z1], { easing: EASE })
  const ox = interpolate(local, [0, 90, 9999], [50 - cx, 50 - cx, 50 - cx], { easing: EASE })
  const oy = interpolate(local, [0, 90, 9999], [50 - cy, 50 - cy, 50 - cy], { easing: EASE })
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={staticFile(src)}
        style={{
          position: 'absolute',
          width: '100%',
          transformOrigin: `${cx}% ${cy}%`,
          transform: `scale(${zoom}) translate(${ox * (zoom - 1) * 0.02}%, ${oy * (zoom - 1) * 0.02}%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  )
}

/** 大字卡（标题/口号） */
const Title: React.FC<{ main: string; sub?: string; from: number }> = ({ main, sub, from }) => {
  const frame = useCurrentFrame()
  const local = frame - from
  const rise = interpolate(local, [8, 40], [26, 0], { easing: EASE, extrapolateRight: 'clamp' })
  const opacity = interpolate(local, [8, 30], [0, 1], { easing: EASE, extrapolateRight: 'clamp' })
  const ruleW = interpolate(local, [22, 52], [0, 120], { easing: EASE, extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', transform: `translateY(${rise}px)`, opacity }}>
        <div style={{ fontFamily: FONT, fontSize: 96, fontWeight: 700, color: '#f2f5fb', letterSpacing: 6 }}>
          {main}
        </div>
        <div style={{ width: ruleW, height: 2, background: C.accent, margin: '26px auto', opacity: 0.9 }} />
        {sub !== undefined
          ? (
              <div style={{ fontFamily: FONT, fontSize: 30, color: C.dim, letterSpacing: 10 }}>
                {sub}
              </div>
            )
          : null}
      </div>
    </AbsoluteFill>
  )
}

/* ---------- 镜头 ---------- */

const ShotIntro: React.FC = () => (
  <>
    <DotGrid />
    <Title main="对话地图" sub="dsh-talk-map · 会话即卡片" from={0} />
    <Caption text="把 DeepSeek Harness 的每一次对话，铺在一张看得见的地图上" from={40} duration={100} />
  </>
)

const ShotBoard: React.FC = () => (
  <>
    <PageCam src="textures/board-full.png" from={SHOTS.board.from - SHOTS.board.from} pan={[50, 42, 1.06, 1.22]} />
    <Caption text="工作区是框架，对话是卡片 —— 拖动即布局，位置永远记得" from={SHOTS.board.from + 30} duration={150} />
    {/* 推近后再做一个轻微的聚焦光效 */}
  </>
)

const ShotDrawer: React.FC = () => (
  <>
    <PageCam src="textures/drawer.png" from={0} pan={[50, 55, 1.12, 1.02]} />
    <Caption text="一个工作区折进一格；点开抽屉，几十个对话一目了然" from={30} duration={130} />
  </>
)

const ShotSearch: React.FC = () => (
  <>
    <PageCam src="textures/search.png" from={0} pan={[50, 18, 1.35, 1.15]} />
    <Caption text="搜索框直接命中卡片正文，关键词高亮，回车即达" from={40} duration={100} />
  </>
)

const ShotLamp: React.FC = () => {
  const frame = useCurrentFrame()
  const local = frame - SHOTS.lamp.from
  const breathe = 1 + 0.02 * Math.sin(local / 9)
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: C.bg }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${1.9 * breathe})`, transformOrigin: 'center', borderRadius: 18, overflow: 'hidden', boxShadow: `0 30px 90px rgba(0,0,0,0.55), 0 0 120px ${C.glow}` }}>
          <Img src={staticFile('textures/card-lamp.png')} style={{ width: 700 }} />
        </div>
      </div>
      <Caption text="谁在运行、谁已完成、谁被搁置 —— 卡片灯牌一眼可辨" from={50} duration={90} />
    </>
  )
}

const ShotOutro: React.FC = () => {
  const frame = useCurrentFrame()
  const local = frame - SHOTS.outro.from
  const opacity = interpolate(local, [10, 40], [0, 1], { easing: EASE, extrapolateRight: 'clamp' })
  return (
    <>
      <DotGrid />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', opacity }}>
          <div style={{ fontFamily: FONT, fontSize: 84, fontWeight: 700, color: '#f2f5fb', letterSpacing: 4 }}>
            对话地图
          </div>
          <div style={{ fontFamily: FONT, fontSize: 28, color: C.dim, marginTop: 30, letterSpacing: 3 }}>
            DSH 插件 · 开源 · Da0Mine/dsh-talk-map
          </div>
          <div style={{ fontFamily: FONT, fontSize: 24, color: C.accent, marginTop: 16, letterSpacing: 6 }}>
            空间记忆，为注意力而生
          </div>
        </div>
      </AbsoluteFill>
      <Caption text="开源可用：一条命令装进你的 Harness" from={60} duration={110} />
    </>
  )
}

/* ---------- 主合成 ---------- */

export const TalkMapPromo: React.FC<{ bgm?: boolean; narration?: boolean }> = ({ bgm = true, narration = true }) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  // 全局首尾淡入淡出
  // Start at 6% brightness, not pure black: frame 0 doubles as the share cover.
  const fade = interpolate(frame, [0, 10, durationInFrames - 12, durationInFrames], [0.06, 1, 1, 0], { easing: EASE })
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, opacity: fade }}>
      <Sequence from={SHOTS.intro.from} durationInFrames={SHOTS.intro.duration}>
        <ShotIntro />
      </Sequence>
      <Sequence from={SHOTS.board.from} durationInFrames={SHOTS.board.duration}>
        <ShotBoard />
      </Sequence>
      <Sequence from={SHOTS.drawer.from} durationInFrames={SHOTS.drawer.duration}>
        <ShotDrawer />
      </Sequence>
      <Sequence from={SHOTS.search.from} durationInFrames={SHOTS.search.duration}>
        <ShotSearch />
      </Sequence>
      <Sequence from={SHOTS.lamp.from} durationInFrames={SHOTS.lamp.duration}>
        <ShotLamp />
      </Sequence>
      <Sequence from={SHOTS.outro.from} durationInFrames={SHOTS.outro.duration}>
        <ShotOutro />
      </Sequence>

      {/* 解说：每段包在自己的 Sequence 里，相对镜头起点钉帧。 */}
      {narration
        ? (
            <>
              <Sequence from={SHOTS.intro.from + 40}><Audio src={staticFile('audio/n1.mp3')} /></Sequence>
              <Sequence from={SHOTS.board.from + 34}><Audio src={staticFile('audio/n2.mp3')} /></Sequence>
              <Sequence from={SHOTS.drawer.from + 32}><Audio src={staticFile('audio/n3.mp3')} /></Sequence>
              <Sequence from={SHOTS.search.from + 42}><Audio src={staticFile('audio/n4.mp3')} /></Sequence>
              <Sequence from={SHOTS.lamp.from + 52}><Audio src={staticFile('audio/n5.mp3')} /></Sequence>
              <Sequence from={SHOTS.outro.from + 62}><Audio src={staticFile('audio/n6.mp3')} /></Sequence>
            </>
          )
        : null}

      {/* SFX 钉帧表（相对帧表达式，时间线平移自动跟随）。 */}
      <Sequence from={SHOTS.intro.from}><Audio src={staticFile('audio/sfx/whoosh.mp3')} volume={0.4} /></Sequence>
      <Sequence from={SHOTS.board.from}><Audio src={staticFile('audio/sfx/whoosh.mp3')} volume={0.3} /></Sequence>
      <Sequence from={SHOTS.drawer.from}><Audio src={staticFile('audio/sfx/whoosh.mp3')} volume={0.28} /></Sequence>
      <Sequence from={SHOTS.search.from}><Audio src={staticFile('audio/sfx/whoosh.mp3')} volume={0.26} /></Sequence>
      <Sequence from={SHOTS.lamp.from}><Audio src={staticFile('audio/sfx/whoosh.mp3')} volume={0.24} /></Sequence>
      {/* 收尾句式：riser → impact（字标落地峰值）→ sparkle 余韵 */}
      <Sequence from={SHOTS.outro.from - 60}><Audio src={staticFile('audio/sfx/riser.mp3')} volume={0.35} /></Sequence>
      <Sequence from={SHOTS.outro.from + 38}><Audio src={staticFile('audio/sfx/impact.mp3')} volume={0.55} /></Sequence>
      <Sequence from={SHOTS.outro.from + 50}><Audio src={staticFile('audio/sfx/sparkle.mp3')} volume={0.3} /></Sequence>

      {bgm ? (
        <Sequence from={0} durationInFrames={SHOTS.board.from}>
          {/* 开场段垫量略抬，避免开头听感单薄。 */}
          <Audio src={staticFile('audio/bgm.mp3')} volume={0.42} />
        </Sequence>
      ) : null}
      {bgm ? (
        <Sequence from={SHOTS.board.from}>
          <Audio src={staticFile('audio/bgm.mp3')} volume={0.3} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  )
}

export const remotionRoot = (
  <>
    <Composition
      id="TalkMapPromo"
      component={TalkMapPromo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ bgm: true, narration: true }}
    />
  </>
)
