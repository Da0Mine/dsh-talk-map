/**
 * 音频接线修正：Remotion 的 <Audio> 没有 sequenceFrom 属性，
 * 必须包在 <Sequence from={...}> 里；并补上 SFX 钉帧表。
 */
import fs from 'node:fs'

const file = 'src/TalkMapPromo.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

const oldAudio = [
  '      {narration',
  '        ? (',
  '            <>',
  "              <Audio src={staticFile('audio/n1.mp3')} sequenceFrom={SHOTS.intro.from + 40} />",
  "              <Audio src={staticFile('audio/n2.mp3')} sequenceFrom={SHOTS.board.from + 34} />",
  "              <Audio src={staticFile('audio/n3.mp3')} sequenceFrom={SHOTS.drawer.from + 32} />",
  "              <Audio src={staticFile('audio/n4.mp3')} sequenceFrom={SHOTS.search.from + 42} />",
  "              <Audio src={staticFile('audio/n5.mp3')} sequenceFrom={SHOTS.lamp.from + 52} />",
  "              <Audio src={staticFile('audio/n6.mp3')} sequenceFrom={SHOTS.outro.from + 62} />",
  '            </>',
  '          )',
  '        : null}',
  '      {bgm',
  "        ? <Audio src={staticFile('audio/bgm.mp3')} volume={0.3} />",
  '        : null}',
].join(D)

const newAudio = [
  '      {/* 解说：每段包在自己的 Sequence 里，相对镜头起点钉帧。 */}',
  '      {narration',
  '        ? (',
  '            <>',
  '              <Sequence from={SHOTS.intro.from + 40}><Audio src={staticFile(\'audio/n1.mp3\')} /></Sequence>',
  '              <Sequence from={SHOTS.board.from + 34}><Audio src={staticFile(\'audio/n2.mp3\')} /></Sequence>',
  '              <Sequence from={SHOTS.drawer.from + 32}><Audio src={staticFile(\'audio/n3.mp3\')} /></Sequence>',
  '              <Sequence from={SHOTS.search.from + 42}><Audio src={staticFile(\'audio/n4.mp3\')} /></Sequence>',
  '              <Sequence from={SHOTS.lamp.from + 52}><Audio src={staticFile(\'audio/n5.mp3\')} /></Sequence>',
  '              <Sequence from={SHOTS.outro.from + 62}><Audio src={staticFile(\'audio/n6.mp3\')} /></Sequence>',
  '            </>',
  '          )',
  '        : null}',
  '',
  '      {/* SFX 钉帧表（相对帧表达式，时间线平移自动跟随）。 */}',
  '      <Sequence from={SHOTS.intro.from}><Audio src={staticFile(\'audio/sfx/whoosh.mp3\')} volume={0.4} /></Sequence>',
  '      <Sequence from={SHOTS.board.from}><Audio src={staticFile(\'audio/sfx/whoosh.mp3\')} volume={0.3} /></Sequence>',
  '      <Sequence from={SHOTS.drawer.from}><Audio src={staticFile(\'audio/sfx/whoosh.mp3\')} volume={0.28} /></Sequence>',
  '      <Sequence from={SHOTS.search.from}><Audio src={staticFile(\'audio/sfx/whoosh.mp3\')} volume={0.26} /></Sequence>',
  '      <Sequence from={SHOTS.lamp.from}><Audio src={staticFile(\'audio/sfx/whoosh.mp3\')} volume={0.24} /></Sequence>',
  '      {/* 收尾句式：riser → impact（字标落地峰值）→ sparkle 余韵 */}',
  '      <Sequence from={SHOTS.outro.from - 60}><Audio src={staticFile(\'audio/sfx/riser.mp3\')} volume={0.35} /></Sequence>',
  '      <Sequence from={SHOTS.outro.from + 38}><Audio src={staticFile(\'audio/sfx/impact.mp3\')} volume={0.55} /></Sequence>',
  '      <Sequence from={SHOTS.outro.from + 50}><Audio src={staticFile(\'audio/sfx/sparkle.mp3\')} volume={0.3} /></Sequence>',
  '',
  '      {bgm',
  '        ? <Audio src={staticFile(\'audio/bgm.mp3\')} volume={0.3} />',
  '        : null}',
]

if (!source.includes(oldAudio)) {
  console.error('audio block anchor missing')
  process.exit(1)
}
source = source.replace(oldAudio, newAudio.join(D))

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('audio wiring fixed')
