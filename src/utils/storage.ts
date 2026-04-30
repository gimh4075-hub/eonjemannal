export interface HostedEvent {
  eventId: string
  title: string
  createdAt: number
}

const HOSTED_KEY = 'eonjemannal_hosted'
const PARTICIPANTS_KEY = 'eonjemannal_participants'

export function getHostedEvents(): HostedEvent[] {
  try {
    const raw = localStorage.getItem(HOSTED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addHostedEvent(event: HostedEvent) {
  try {
    const list = getHostedEvents()
    list.unshift(event)
    localStorage.setItem(HOSTED_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

export function removeHostedEvent(eventId: string) {
  try {
    const list = getHostedEvents().filter(e => e.eventId !== eventId)
    localStorage.setItem(HOSTED_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

export function getStoredParticipant(eventId: string) {
  try {
    const raw = localStorage.getItem(PARTICIPANTS_KEY)
    if (!raw) return null
    return (JSON.parse(raw) as Record<string, { participantId: string; name: string }>)[eventId] ?? null
  } catch { return null }
}

export function storeParticipant(eventId: string, info: { participantId: string; name: string }) {
  try {
    const raw = localStorage.getItem(PARTICIPANTS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    map[eventId] = info
    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(map))
  } catch { /* ignore */ }
}
