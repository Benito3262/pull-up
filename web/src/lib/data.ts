import { useCallback, useEffect, useRef, useState } from 'react'
import { viewMethod } from './near'
import type { Activity, EventView, GuestStatus, Stats } from './near'

export type Phase = 'upcoming' | 'live' | 'settling' | 'past'

export function phaseOf(e: EventView, now = Date.now()): Phase {
  if (e.closed) return 'past'
  if (now > e.check_in_deadline_ms) return 'settling'
  if (now >= e.starts_ms) return 'live'
  return 'upcoming'
}

export function usePoll<T>(fn: () => Promise<T>, deps: unknown[], ms = 10000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const f = useRef(fn)
  f.current = fn
  const load = useCallback(async () => {
    try {
      setData(await f.current())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    load()
    const t = setInterval(load, ms)
    return () => clearInterval(t)
  }, [load, ms])
  return { data, error, reload: load }
}

let eventsCache: Promise<EventView[]> | null = null
let eventsAt = 0
export function fetchEvents(force = false): Promise<EventView[]> {
  if (!eventsCache || force || Date.now() - eventsAt > 8000) {
    eventsAt = Date.now()
    eventsCache = viewMethod<EventView[]>('list_events', { from_index: 1, limit: 100 }).catch((e) => {
      eventsCache = null
      throw e
    })
  }
  return eventsCache
}

export const useEvents = () => usePoll(() => fetchEvents(true), [], 12000)
export const useStats = () => usePoll(() => viewMethod<Stats>('get_stats'), [], 12000)
export const useActivity = (limit = 20) =>
  usePoll(() => viewMethod<Activity[]>('recent_activity', { limit }), [limit], 8000)

export type GuestRow = [string, GuestStatus]
export async function fetchAllGuests(events: EventView[]) {
  const out: Record<number, GuestRow[]> = {}
  await Promise.all(
    events.map(async (e) => {
      out[e.id] = await viewMethod<GuestRow[]>('list_guests', { event_id: e.id })
    }),
  )
  return out
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function timeAgo(ts: number, now = Date.now()) {
  const s = Math.max(1, Math.round((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function countdown(target: number, now = Date.now()) {
  let d = Math.max(0, target - now)
  const days = Math.floor(d / 86400000)
  d -= days * 86400000
  const h = Math.floor(d / 3600000)
  d -= h * 3600000
  const m = Math.floor(d / 60000)
  const s = Math.floor((d % 60000) / 1000)
  if (days > 0) return `${days}d ${h}h ${m}m`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function nearNum(yocto: string): number {
  return Number(BigInt(yocto) / 10n ** 18n) / 1e6
}
export function fmtNear(yocto: string, dp = 2) {
  const n = nearNum(yocto)
  return `${n.toLocaleString(undefined, { maximumFractionDigits: dp })} NEAR`
}
