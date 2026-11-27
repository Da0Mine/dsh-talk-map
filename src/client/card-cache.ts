/**
 * Card snapshot cache.
 *
 * `/talk-map/state` is a Host round trip; until it returns there are no cards at all, so the rail
 * cannot paint anything (titles or bodies) no matter how good the other caches are. This keeps a
 * thin projection of the board in localStorage — id, session, board, position, title — so the rail
 * can render immediately and be corrected when the real state arrives.
 */
import type { Card } from '../shared/model.ts'

const STORAGE_KEY = 'dsh.talk-map.cards.v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface Snapshot {
  at: number
  cards: Record<string, Card>
}

let cache: Record<string, Card> | null = null
let timer: ReturnType<typeof setTimeout> | undefined

export function readCards(): Record<string, Card> {
  if (cache !== null) return cache
  if (typeof localStorage === 'undefined') {
    cache = {}
    return cache
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      cache = {}
      return cache
    }
    const parsed = JSON.parse(raw) as Partial<Snapshot> | null
    if (parsed === null || typeof parsed !== 'object') {
      cache = {}
      return cache
    }
    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > MAX_AGE_MS) {
      cache = {}
      return cache
    }
    cache = parsed.cards !== null && typeof parsed.cards === 'object' ? parsed.cards : {}
  } catch {
    cache = {}
  }
  return cache
}

export function putCards(cards: Record<string, Card>): void {
  cache = cards
  if (typeof localStorage === 'undefined') return
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      // Only what the rail needs: positions are read from the Host anyway.
      const thin: Record<string, Card> = {}
      for (const [cardId, card] of Object.entries(cards)) {
        thin[cardId] = {
          boardId: card.boardId,
          sessionId: card.sessionId,
          x: card.x,
          y: card.y,
          createdAt: card.createdAt,
          ...(card.title !== undefined ? { title: card.title } : {}),
        }
      }
      const snapshot: Snapshot = { at: Date.now(), cards: thin }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      /* quota or blocked storage: the in-memory copy still works for this session */
    }
  }, 500)
}
