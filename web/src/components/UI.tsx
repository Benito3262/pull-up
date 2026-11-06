import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { EventView } from '../lib/near'
import { countdown, filterPublicEvents, fmtDate, fmtNear, phaseOf, timeAgo, useActivity, useEvents, useNow } from '../lib/data'
import { shortAccount } from '../lib/config'
import { Cover } from './Cover'

// ── toasts ──
type Toast = { id: number; text: string; kind?: 'ok' | 'err' | 'info' }
const ToastCtx = createContext<(t: string, kind?: Toast['kind']) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x.slice(-3), { id, text, kind }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="toast-dot" />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const KIND_LABEL: Record<string, string> = {
  create: 'created an event',
  deposit: 'staked to RSVP',
  check_in: 'pulled up',
  close: 'settled an event',
  claim: 'claimed a payout',
}
const KIND_ICON: Record<string, string> = { create: '✦', deposit: '◎', check_in: '✓', close: '⚑', claim: '↑' }

/** Live ticker of on-chain activity; toasts when new activity appears. */
export function Ticker() {
  const { data: raw } = useActivity(40)
  const { data: events } = useEvents()
  const now = useNow(5000)
  const toast = useToast()
  const seen = useRef<string | null>(null)
  const publicIds = new Set(filterPublicEvents(events).map((e) => e.id))
  // Until events load, show nothing rather than test noise
  const data = events ? (raw || []).filter((a) => publicIds.has(a.event_id)).slice(0, 24) : null
  useEffect(() => {
    if (!data?.length) return
    const top = `${data[0].ts_ms}-${data[0].account}-${data[0].kind}`
    if (seen.current && seen.current !== top) toast(`${shortAccount(data[0].account)} ${KIND_LABEL[data[0].kind] || data[0].kind}`, 'ok')
    seen.current = top
  }, [data, toast])
  if (!data) return <div className="ticker"><div className="ticker-skel shimmer" /></div>
  if (!data.length) return null
  const items = [...data, ...data]
  return (
    <div className="ticker" aria-label="Live on-chain activity">
      <span className="ticker-live"><i /> LIVE</span>
      <div className="ticker-track">
        {items.map((a, i) => (
          <Link to={`/e/${a.event_id}`} key={i} className={`tick tick-${a.kind}`}>
            <b>{KIND_ICON[a.kind]}</b> {a.account.split('.')[0]} {KIND_LABEL[a.kind] || a.kind} · #{a.event_id} <em>{timeAgo(a.ts_ms, now)}</em>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function PhaseBadge({ ev }: { ev: EventView }) {
  const p = phaseOf(ev)
  const label = { upcoming: 'Upcoming', live: 'Live now', settling: 'Settling', past: 'Settled' }[p]
  return <span className={`badge badge-${p}`}>{p === 'live' && <i className="pulse" />}{label}</span>
}

export function Countdown({ to, prefix }: { to: number; prefix?: string }) {
  const now = useNow(1000)
  return <span className="mono">{prefix}{countdown(to, now)}</span>
}

export function Avatar({ id, size = 28 }: { id: string; size?: number }) {
  let h = 0
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) % 360
  return (
    <span className="avatar" style={{ width: size, height: size, background: `linear-gradient(135deg,hsl(${h} 85% 65%),hsl(${(h + 60) % 360} 80% 55%))`, fontSize: size * 0.42 }}>
      {id[0]?.toUpperCase()}
    </span>
  )
}

export function EventCard({ ev }: { ev: EventView }) {
  const p = phaseOf(ev)
  const rate = ev.guest_count ? Math.round((ev.checked_in_count / ev.guest_count) * 100) : 0
  const spots = ev.capacity ? Math.max(0, ev.capacity - ev.guest_count) : null
  return (
    <Link to={`/e/${ev.id}`} className="ecard">
      <div className="ecard-cover">
        <Cover kind={ev.cover || ev.title} />
        <PhaseBadge ev={ev} />
        <span className="ecard-dep">{fmtNear(ev.deposit)} stake</span>
      </div>
      <div className="ecard-body">
        <div className="ecard-cat">{ev.category || 'Event'} · {ev.location || 'TBA'}</div>
        <h3>{ev.title}</h3>
        <div className="ecard-meta">
          {p === 'upcoming' && <span>Starts in <Countdown to={ev.starts_ms} /></span>}
          {p === 'live' && <span>Doors close in <Countdown to={ev.check_in_deadline_ms} /></span>}
          {p === 'settling' && <span>Awaiting close</span>}
          {p === 'past' && <span>{rate}% pulled up · paid {fmtNear(ev.payout_per_attendee)} each</span>}
        </div>
        <div className="ecard-foot">
          <div className="bar"><i style={{ width: `${ev.capacity ? Math.min(100, (ev.guest_count / ev.capacity) * 100) : Math.min(100, ev.guest_count * 10)}%` }} /></div>
          <span>{ev.guest_count} going{spots !== null && p !== 'past' ? ` · ${spots} left` : ''}</span>
        </div>
      </div>
    </Link>
  )
}

export function CardSkeleton({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="ecard skel">
          <div className="ecard-cover shimmer" />
          <div className="ecard-body">
            <div className="line shimmer" style={{ width: '40%' }} />
            <div className="line shimmer" style={{ width: '85%', height: 18 }} />
            <div className="line shimmer" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-ico">◌</div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export function PageHead({ eyebrow, title, sub, children }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="phead reveal">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {sub && <p className="lede">{sub}</p>}
      {children}
    </header>
  )
}

export { fmtDate }

/** Reveal-on-scroll for elements with .reveal */
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.08 },
    )
    const scan = () => document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}
