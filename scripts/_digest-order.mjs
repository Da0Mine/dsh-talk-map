import fs from 'node:fs'
const f = 'src/client/rail-menu.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `    const loadDigest = async (): Promise<{ digest: import('../shared/model.ts').Digest | undefined }> => {
      try {
        return await talkMapApi.ensureDigest(props.target.sessionId)
      } catch (cause) {
        // Older hosts have no /digest/ensure: read the stored digest out of the state payload.
        console.warn('[dsh-talk-map] ensureDigest failed, falling back to state:', cause)
        const state = await talkMapApi.getState()
        return { digest: state.digests?.[props.target.sessionId] }
      }
    }`,
  `    const loadDigest = async (): Promise<{ digest: import('../shared/model.ts').Digest | undefined }> => {
      // The state payload already carries the stored digests: read it first, since /digest/ensure
      // is refused for sessions that are not live (which is exactly the case for old rail cards).
      try {
        const state = await talkMapApi.getState()
        const stored = state.digests?.[props.target.sessionId]
        if (stored !== undefined) return { digest: stored }
      } catch (cause) {
        console.warn('[dsh-talk-map] digest: state read failed, trying ensure:', cause)
      }
      try {
        return await talkMapApi.ensureDigest(props.target.sessionId)
      } catch (cause) {
        console.warn('[dsh-talk-map] digest: ensure failed too:', cause)
        return { digest: undefined }
      }
    }`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('rail-menu: 先读 state 里的摘要，再退到 ensure')
