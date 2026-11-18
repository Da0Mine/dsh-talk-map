import fs from 'node:fs'

// 1) 宿主补 /talk-map/client-boot（客户端诊断上报；此前没实现 → 每次跳转都 404）
{
  const f = 'src/host/routes.ts'
  let t = fs.readFileSync(f, 'utf8')
  if (!t.includes("POST /talk-map/client-boot")) {
    const anchor = "        if (route === 'POST /talk-map/queue') {"
    if (!t.includes(anchor)) throw new Error('queue anchor missing')
    const block = `        if (route === 'POST /talk-map/client-boot') {
          // Client-side diagnostics (search/jump failures). Accepted and acknowledged only:
          // the route existed on the client for months while the Host never registered it,
          // so every report came back 404. No disk I/O — this must stay cheap.
          try {
            const body = await readJsonBody(request)
            if (runtime.debugLog !== undefined) runtime.debugLog('client-boot', body)
          } catch { /* an unreadable report is still acknowledged */ }
          sendJson(response, 200, { ok: true })
          return
        }

`
    t = t.replace(anchor, block + anchor)
    fs.writeFileSync(f, t, 'utf8')
    console.log('host: /talk-map/client-boot route added')
  } else { console.log('host: route already present') }
}

// 2) .wsFrame：几何按外框算，边框不能再额外加 2px
{
  const f = 'src/client/talk-map.module.css'
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  if (lines.some(l => l.includes('box-sizing: border-box;') && false)) { /* noop */ }
  const at = lines.findIndex(l => l.trim() === '.wsFrame {')
  if (at < 0) throw new Error('.wsFrame not found')
  if (lines.slice(at, at + 12).some(l => l.includes('box-sizing'))) {
    console.log('css: already border-box')
  } else {
    const posAt = lines.findIndex((l, i) => i > at && i < at + 8 && l.includes('position: relative;'))
    if (posAt < 0) throw new Error('position line not found')
    lines.splice(posAt + 1, 0,
      '  /* x/width describe the OUTER box: with content-box the 1px border was added on top',
      '     and the frame overlapped its right-hand neighbour by 2px when stretched. */',
      '  box-sizing: border-box;',
    )
    fs.writeFileSync(f, lines.join('\n'), 'utf8')
    console.log('css: .wsFrame box-sizing: border-box')
  }
}
