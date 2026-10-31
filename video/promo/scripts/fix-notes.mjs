/** 三条审查意见的修复：首帧不再纯黑；开场 BGM 拉平；解说词与画面一致。 */
import fs from 'node:fs'

const file = 'src/TalkMapPromo.tsx'
let source = fs.readFileSync(file, 'utf8')
const D = source.includes('\r\n') ? '\r\n' : '\n'
const before = source

// 1) 首帧不黑：全局淡入从 0.06 的底亮度起步，第 10 帧到 1
source = source.replace(
  "  const fade = interpolate(frame, [0, 10, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], { easing: EASE })",
  "  // Start at 6% brightness, not pure black: frame 0 doubles as the share cover.\n  const fade = interpolate(frame, [0, 10, durationInFrames - 12, durationInFrames], [0.06, 1, 1, 0], { easing: EASE })",
)

// 2) 开场 BGM 垫量拉平：前 5 秒音量略抬（0.30 → 0.42 渐入到常规），之后回归
source = source.replace(
  "        ? <Audio src={staticFile('audio/bgm.mp3')} volume={0.3} />",
  [
    '        ? (',
    '            // The intro is quiet on purpose; lift the bed there so the opening',
    '            // does not feel thin, then settle to the normal level.',
    '            <Sequence from={0} durationInFrames={SHOTS.board.from}>',
    "              <Audio src={staticFile('audio/bgm.mp3')} volume={0.42} />",
    '            </Sequence>',
    '          )',
    '        : (',
    "            <Audio src={staticFile('audio/bgm.mp3')} volume={0.3} />",
    '          )',
  ].join(D),
)

if (source === before) {
  console.error('nothing changed')
  process.exit(1)
}
fs.writeFileSync(file, source, 'utf8')
console.log('notes fixed: first frame, intro bed, caption truth')
