import { useState, useEffect, useCallback } from 'react'
import { Event, Participant, AvailabilityResult, VotesResult, LocalParticipantInfo } from '../types'

const STORAGE_KEY = 'eonjemannal_participants'

function getStoredParticipant(eventId: string): LocalParticipantInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, LocalParticipantInfo>
    return map[eventId] ?? null
  } catch {
    return null
  }
}

function storeParticipant(eventId: string, info: LocalParticipantInfo) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, LocalParticipantInfo>) : {}
    map[eventId] = info
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

export function useEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResult | null>(null)
  const [votesResult, setVotesResult] = useState<VotesResult | null>(null)
  const [localParticipant, setLocalParticipant] = useState<LocalParticipantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    const stored = getStoredParticipant(eventId)
    setLocalParticipant(stored)
  }, [eventId])

  const fetchEvent = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/events?id=${eventId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '이벤트를 불러오는데 실패했습니다.')
      }
      const data = await res.json()
      setEvent(data.event)
      setParticipants(data.participants)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }, [eventId])

  const fetchAvailability = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/availability?eventId=${eventId}`)
      if (!res.ok) return
      const data = await res.json()
      setAvailabilityResult(data)
    } catch {
      // silently fail on poll
    }
  }, [eventId])

  const fetchVotes = useCallback(async () => {
    if (!eventId) return
    try {
      const res = await fetch(`/api/votes?eventId=${eventId}`)
      if (!res.ok) return
      const data = await res.json()
      setVotesResult(data)
    } catch {
      // silently fail
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    Promise.all([fetchEvent(), fetchAvailability(), fetchVotes()]).finally(() =>
      setLoading(false)
    )
  }, [eventId, fetchEvent, fetchAvailability, fetchVotes])

  const joinEvent = useCallback(
    async (name: string): Promise<LocalParticipantInfo | null> => {
      if (!eventId) return null
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '참여 중 오류가 발생했습니다.')
      }
      const data = await res.json()
      const info: LocalParticipantInfo = { participantId: data.participantId, name: data.name }
      storeParticipant(eventId, info)
      setLocalParticipant(info)
      await fetchEvent()
      await fetchAvailability()
      return info
    },
    [eventId, fetchEvent, fetchAvailability]
  )

  const submitAvailability = useCallback(
    async (dates: string[]) => {
      if (!eventId || !localParticipant) throw new Error('참여자 정보가 없습니다.')
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, participantId: localParticipant.participantId, dates }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '저장 중 오류가 발생했습니다.')
      }
      await fetchAvailability()
    },
    [eventId, localParticipant, fetchAvailability]
  )

  const castVote = useCallback(
    async (date: string) => {
      if (!eventId || !localParticipant) throw new Error('참여자 정보가 없습니다.')
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, participantId: localParticipant.participantId, date }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '투표 중 오류가 발생했습니다.')
      }
      await fetchVotes()
    },
    [eventId, localParticipant, fetchVotes]
  )

  return {
    event,
    participants,
    availabilityResult,
    votesResult,
    localParticipant,
    loading,
    error,
    joinEvent,
    submitAvailability,
    castVote,
    refetchAvailability: fetchAvailability,
    refetchVotes: fetchVotes,
  }
}
