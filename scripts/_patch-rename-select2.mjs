import fs from 'node:fs'
function patch(file, opts) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const refAnchor = lines.findIndex(l => l.includes(opts.refNeedle))
  if (refAnchor < 0) throw new Error(file + ': ref anchor missing')
  const effStart = lines.findIndex(l => l.trim().startsWith('useEffect(() => {'))
  if (effStart < 0) throw new Error(file + ': effect start missing')
  let effEnd = effStart
  while (effEnd < lines.length && !lines[effEnd].includes('}, [props])')) effEnd += 1
  if (effEnd >= lines.length) throw new Error(file + ': effect end missing')
  const indent = lines[effStart].match(/^\s*/)[0]
  const body = opts.body(indent)
  lines.splice(effStart, effEnd - effStart + 1, ...body)
  // 插入 ref 两行（在 refAnchor 之后）
  const after = refAnchor
  lines.splice(after + 1, 0, ...opts.refLines.map(l => indent + l))
  fs.writeFileSync(file, lines.join('\n'), 'utf8')
  const rest = fs.readFileSync(file, 'utf8').includes('}, [props])')
  console.log(file, '-> effect replaced, [props] remaining:', rest)
}

patch('src/client/RenameDialog.tsx', {
  refNeedle: 'const inputRef = useRef',
  refLines: [
    '// Mount-only: keep the latest onDone without re-running the effect on every render.',
    '// Depending on `props` re-focused and re-selected the input after EVERY keystroke,',
    '// so typing overwrote what you had already written.',
    'const onDoneRef = useRef(props.onDone)',
    'onDoneRef.current = props.onDone',
  ],
  body: (indent) => [
    indent + 'useEffect(() => {',
    indent + '  const release = mapUi.claimEscape(\'rename-dialog\')',
    indent + '  const onKeyDown = (event: KeyboardEvent): void => {',
    indent + '    if (event.key !== \'Escape\') return',
    indent + '    event.stopPropagation()',
    indent + '    onDoneRef.current(null)',
    indent + '  }',
    indent + '  window.addEventListener(\'keydown\', onKeyDown, { capture: true })',
    indent + '  // Select-all exactly once, on open: that is the "type to replace the old name"',
    indent + '  // affordance. Doing it per render broke ordinary appending.',
    indent + '  inputRef.current?.focus()',
    indent + '  inputRef.current?.select()',
    indent + '  return () => {',
    indent + '    release()',
    indent + '    window.removeEventListener(\'keydown\', onKeyDown, { capture: true })',
    indent + '  }',
    indent + '}, [])',
  ],
})

patch('src/client/DigestDialog.tsx', {
  refNeedle: 'const textRef = useRef',
  refLines: [
    '// Same trap as the rename dialog: `props` changes identity every render, so the ESC',
    '// listener was torn down and re-added on each keystroke. Keep the callback in a ref.',
    'const onCloseRef = useRef(props.onClose)',
    'onCloseRef.current = props.onClose',
  ],
  body: (indent) => [
    indent + 'useEffect(() => {',
    indent + '  const release = mapUi.claimEscape(\'digest-dialog\')',
    indent + '  const onKeyDown = (event: KeyboardEvent): void => {',
    indent + '    if (event.key !== \'Escape\') return',
    indent + '    event.stopPropagation()',
    indent + '    onCloseRef.current()',
    indent + '  }',
    indent + '  window.addEventListener(\'keydown\', onKeyDown, { capture: true })',
    indent + '  return () => {',
    indent + '    window.removeEventListener(\'keydown\', onKeyDown, { capture: true })',
    indent + '    release()',
    indent + '  }',
    indent + '}, [])',
  ],
})
