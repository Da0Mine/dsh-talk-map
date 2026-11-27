import fs from 'node:fs'
const f = 'src/client/rail-menu.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `        const state = await talkMapApi.fetchState()
        return { digest: state.digests?.[props.target.sessionId] }`,
  `        const state = await talkMapApi.getState()
        return { digest: state.digests?.[props.target.sessionId] }`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('rail-menu: 回退改用 getState()')
