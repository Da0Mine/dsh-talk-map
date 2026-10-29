/**
 * After jumping into a conversation from a search hit, put the *matched record*
 * on screen: scroll the transcript until that text appears, then flash it.
 *
 * The shell renders the transcript, so this walks text nodes. Opening a session
 * always lands at the newest message, and the match is usually further up —
 * hence the scan: step the scroller upwards, checking after each step, and fall
 * back to scanning downwards from the top.
 */
const MARK_CLASS = 'tm_search_flash'
const STYLE_ID = 'tm-search-flash-style'

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .${MARK_CLASS} {
      background: rgba(255, 214, 106, 0.42);
      box-shadow: 0 0 0 2px rgba(255, 214, 106, 0.42);
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

/** The tallest scrollable box that is probably the message list. */
function transcriptScroller(): HTMLElement | null {
  let best: HTMLElement | null = null
  for (const element of document.querySelectorAll<HTMLElement>('div, main, section')) {
    if (element.scrollHeight <= element.clientHeight + 60) continue
    if (element.closest('[class*="tm_"]') !== null) continue
    const overflow = getComputedStyle(element).overflowY
    if (overflow !== 'auto' && overflow !== 'scroll') continue
    if (best === null || element.scrollHeight > best.scrollHeight) best = element
  }
  return best
}

function markNode(node: Text, needle: string): HTMLElement | null {
  const value = node.nodeValue ?? ''
  const at = value.toLowerCase().indexOf(needle)
  if (at < 0) return null
  const range = document.createRange()
  range.setStart(node, at)
  range.setEnd(node, at + needle.length)
  const mark = document.createElement('mark')
  mark.className = MARK_CLASS
  try {
    range.surroundContents(mark)
  } catch {
    return null
  }
  return mark
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

/** Wait for the transcript, scan to the record, flash it, then clean up. */
export function flashInTranscript(query: string): void {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return
  ensureStyle()

  let steps = 0
  let direction: 'up' | 'down' = 'up'
  let atTop = false
  const maxSteps = 26

  const tick = (): void => {
    const node = findNode(needle)
    if (node !== null) {
      const mark = markNode(node, needle)
      if (mark !== null) {
        flash(mark)
        return
      }
    }
    steps += 1
    if (steps > maxSteps) return
    const scroller = transcriptScroller()
    if (scroller !== null) {
      const step = Math.max(240, Math.round(scroller.clientHeight * 0.8))
      if (direction === 'up') {
        if (scroller.scrollTop <= 2 && atTop) {
          direction = 'down'
          scroller.scrollTop = 0
        } else {
          if (scroller.scrollTop <= 2) atTop = true
          scroller.scrollTop = Math.max(0, scroller.scrollTop - step)
        }
      } else {
        scroller.scrollTop = Math.min(scroller.scrollHeight, scroller.scrollTop + step)
      }
    }
    window.setTimeout(tick, 140)
  }
  window.setTimeout(tick, 160)
}
