/**
 * After jumping into a conversation from a search hit, put the matched record on
 * screen and flash it.
 *
 * Primary path: the engine's own find (`window.find`), which scrolls to the
 * match even when the transcript renders lazily. Fallback: walk the transcript's
 * text nodes (older builds / engines without `find`).
 */
const MARK_CLASS = 'tm_search_flash'
const STYLE_ID = 'tm-search-flash-style'

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .${MARK_CLASS} {
      background: rgba(255, 214, 106, 0.45);
      box-shadow: 0 0 0 2px rgba(255, 214, 106, 0.45);
      border-radius: 3px;
      transition: background 600ms ease-out, box-shadow 600ms ease-out;
    }
    .${MARK_CLASS}.tm_search_flash_out {
      background: rgba(255, 214, 106, 0);
      box-shadow: 0 0 0 2px rgba(255, 214, 106, 0);
    }
  `
  document.head.appendChild(style)
}

/** Our own panel, the sidebar and the composer are not the transcript. */
function isTranscriptNode(node: Text, needle: string): boolean {
  const value = node.nodeValue
  if (value === null || !value.toLowerCase().includes(needle)) return false
  const parent = node.parentElement
  if (parent === null) return false
  if (parent.closest('[class*="tm_"]') !== null) return false
  if (parent.closest('nav, aside, header, footer, textarea') !== null) return false
  return true
}

function findNode(needle: string): Text | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current !== null) {
    const text = current as Text
    if (isTranscriptNode(text, needle)) return text
    current = walker.nextNode()
  }
  return null
}

function flash(mark: HTMLElement): void {
  mark.scrollIntoView({ block: 'center', behavior: 'smooth' })
  window.setTimeout(() => {
    mark.classList.add('tm_search_flash_out')
    window.setTimeout(() => {
      const parent = mark.parentNode
      if (parent === null) return
      while (mark.firstChild !== null) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
    }, 700)
  }, 4500)
}

/** Wrap the range `window.find` just selected. */
function markSelection(): HTMLElement | null {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (range.collapsed) return null
  const mark = document.createElement('mark')
  mark.className = MARK_CLASS
  try {
    range.surroundContents(mark)
  } catch {
    return null
  }
  selection.removeAllRanges()
  return mark
}

/** The engine's own find: scrolls to the match, works with lazy transcripts. */
function findInPage(needle: string): HTMLElement | null {
  const finder = (window as unknown as { find?: (...args: unknown[]) => boolean }).find
  if (typeof finder !== 'function') return null
  // (text, caseSensitive, backwards, wrapAround, wholeWord, searchInFrames, showDialog)
  const found = finder.call(window, needle, false, false, true, false, false, false)
  if (found !== true) return null
  return markSelection()
}

export function flashInTranscript(query: string): void {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return
  ensureStyle()

  let waited = 0
  const deadline = 7000

  const attempt = (): void => {
    const viaFind = findInPage(needle)
    if (viaFind !== null) {
      flash(viaFind)
      return
    }
    const node = findNode(needle)
    if (node !== null) {
      const value = node.nodeValue ?? ''
      const at = value.toLowerCase().indexOf(needle)
      if (at >= 0) {
        const range = document.createRange()
        range.setStart(node, at)
        range.setEnd(node, at + needle.length)
        const mark = document.createElement('mark')
        mark.className = MARK_CLASS
        try {
          range.surroundContents(mark)
          flash(mark)
          return
        } catch { /* keep waiting */ }
      }
    }
    waited += 200
    if (waited > deadline) return
    window.setTimeout(attempt, 200)
  }

  // The transcript needs a moment to mount after the panel switches.
  window.setTimeout(attempt, 160)
}
