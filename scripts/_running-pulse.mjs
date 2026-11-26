import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('@keyframes talkmap-lamp-pulse')) {
  t += `
/* Running cards breathe too: the sweep ring moves, and the glow around it pulses. The ring alone
   read as static whenever the card was scrolled half out of view. */
.cardLampRunning {
  animation: talkmap-lamp-pulse 2.4s ease-in-out infinite;
}

@keyframes talkmap-lamp-pulse {
  0%, 100% {
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.34),
      0 0 16px 2px rgba(255, 255, 255, 0.2),
      0 0 40px 9px rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.52),
      0 0 22px 4px rgba(255, 255, 255, 0.34),
      0 0 58px 15px rgba(255, 255, 255, 0.16);
  }
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 运行中卡片加呼吸脉冲')
}
