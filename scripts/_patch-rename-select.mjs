/**
 * Rename dialog: the input re-selected its whole text after every keystroke.
 *
 * `useEffect(..., [props])` — a function component's `props` object is a NEW identity on
 * every render, so typing one character (setValue → re-render) re-ran the effect and called
 * input.select() again. Same mistake in DigestDialog (where it re-registered the ESC
 * listener every render). Both now keep the latest callback in a ref and run once on mount.
 */
import fs from 'node:fs'

const edits = []

// ── RenameDialog ───────────────────────────────────────────────────────────
{
  const file = 'src/client/RenameDialog.tsx'
  let text = fs.readFileSync(file, 'utf8')

  text = text.replace(
    `  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const release = mapUi.claimEscape('rename-dialog')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      props.onDone(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    inputRef.current?.focus()
    inputRef.current?.select()
    return () => {
      release()
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [props])`,
    `  const inputRef = useRef<HTMLInputElement | null>(null)
  // Mount-only: capture the latest onDone without re-running the effect on every render.
  // Depending on \`props\` meant "re-focus and select-all after every keystroke", which made
  // typing overwrite the text you had already entered.
  const onDoneRef = useRef(props.onDone)
  onDoneRef.current = props.onDone

  useEffect(() => {
    const release = mapUi.claimEscape('rename-dialog')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onDoneRef.current(null)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    // Select-all exactly once, when the dialog opens — that is what makes "type to
    // replace the old name" work; doing it per render broke ordinary appending.
    inputRef.current?.focus()
    inputRef.current?.select()
    return () => {
      release()
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [])`,
  )
  if (text.includes('}, [props])')) throw new Error('RenameDialog still depends on [props]')
  fs.writeFileSync(file, text, 'utf8')
  edits.push('RenameDialog: mount-only effect')
}

// ── DigestDialog ───────────────────────────────────────────────────────────
{
  const file = 'src/client/DigestDialog.tsx'
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(
    `  const textRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const release = mapUi.claimEscape('digest-dialog')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      props.onClose()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      release()
    }
  }, [props])`,
    `  const textRef = useRef<HTMLTextAreaElement | null>(null)
  // Same trap as the rename dialog: \`props\` changes identity every render, so the listener
  // was torn down and re-registered on each keystroke. Keep the callback in a ref instead.
  const onCloseRef = useRef(props.onClose)
  onCloseRef.current = props.onClose

  useEffect(() => {
    const release = mapUi.claimEscape('digest-dialog')
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      release()
    }
  }, [])`,
  )
  if (text.includes('}, [props])')) throw new Error('DigestDialog still depends on [props]')
  fs.writeFileSync(file, text, 'utf8')
  edits.push('DigestDialog: mount-only effect')
}

console.log(edits.join('\n'))
