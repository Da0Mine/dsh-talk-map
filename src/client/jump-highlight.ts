/**
 * After jumping into a conversation from a search hit, put the matched text on
 * screen: scroll to it and flash it for a few seconds.
 *
 * The transcript is rendered by the shell, so this walks its text nodes rather
 * than asking React: find the first occurrence, wrap it in a <mark> we own, jump
 * to it, and put the DOM back afterwards. Purely transient — a re-render simply
 * drops the wrapper.
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

/** Where the shell renders messages: skip our own panel and the sidebar. */
function isTranscriptNode(node: Text, query: string): boolean {
  if (node.nodeValue === null || !node.nodeValue.toLowerCase().includes(query)) return false
  const parent = node.parentElement
  if (parent === null) return false
  if (parent.closest('[class*="tm_"]') !== null) return false
  if (parent.closest('nav, aside, header') !== null) return false
  return true
}

function findNode(query: string): Text | null {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current !== null) {
    const text = current as Text
    if (isTranscriptNode(text, query)) return text
    current = walker.nextNode()
  }
  return null
}

function markNode(node: Text, query: string): HTMLElement | null {
  const value = node.nodeValue ?? ''
  const at = value.toLowerCase().indexOf(query)
  if (at < 0) return null
  const range = document.createRange()
  range.setStart(node, at)
  range.setEnd(node, at + query.length)
  const mark = document.createElement('mark')
  mark.className = MARK_CLASS
  try {
    range.surroundContents(mark)
  } catch {
    return null
  }
  return mark
}

/** Wait for the transcript, then flash the term; cleans up after itself. */
export function flashInTranscript(query: string): void {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return
  ensureStyle()
  const deadline = Date.now() + 6000
  const tick = (): void => {
    const node = findNode(needle)
    if (node !== null) {
      const mark = markNode(node, needle)
      if (mark !== null) {
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
        return
      }
    }
    if (Date.now() < deadline) window.setTimeout(tick, 200)
  }
  window.setTimeout(tick, 120)
}
