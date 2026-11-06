import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { callMethod, txUrl, viewMethod } from '../lib/near'
import type { EventView, GuestStatus } from '../lib/near'
import { ACCOUNT_EXPLORER, shortAccount } from '../lib/config'
import { useAccount, connect } from '../components/WalletButton'
import { Cover } from '../components/Cover'
import { Mascot } from '../components/Brand'
import { Avatar, Countdown, PhaseBadge, fmtDate, useToast } from '../components/UI'
import { fmtNear, nearNum, phaseOf } from '../lib/data'
import { SEED_TXS } from '../lib/seedTxs'

export const ticketKey = (eventId: number | string, account: string) => `pullup:ticket:${eventId}:${account}`
const STATUS: Record<GuestStatus, [string, string]> = {
  Deposited: ['Staked', 'warn'],
  CheckedIn: ['Pulled up', 'ok'],
  Claimed: ['Paid out', 'ok'],
}

export function EventPage() {
  const { id } = useParams()
  const eventId = Number(id)
  const account = useAccount()
  const toast = useToast()
  const [ev, setEv] = useState<EventView | null>(null)
  const [guests, setGuests] = useState<[string, GuestStatus][]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastTx, setLastTx] = useState<string | null>(null)
  const [ticket, setTicket] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [e, g] = await Promise.all([
      viewMethod<EventView>('get_event', { event_id: eventId }),
      viewMethod<[string, GuestStatus][]>('list_guests', { event_id: eventId }),
    ])
    setEv(e)
    setGuests(g)
  }, [eventId])

  useEffect(() => {
    load().catch((e) => setError(String(e)))
    const t = setInterval(() => load().catch(() => {}), 6000)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => { if (account) setTicket(localStorage.getItem(ticketKey(eventId, account))) }, [account, eventId])

  const mine = useMemo(() => (account ? guests.find(([a]) => a === account)?.[1] ?? null : null), [account, guests])
  if (!ev)
    return (
      <div className="page">
        {error ? <div className="error">Event not found. <Link to="/explore">Explore events</Link></div> : (
          <div className="ev-skel"><div className="shimmer" style={{ height: 320, borderRadius: 24 }} /><div className="line shimmer" style={{ width: '60%', height: 32, marginTop: 24 }} /></div>
        )}
      </div>
    )

  const phase = phaseOf(ev)
  const isHost = account === ev.host
  const rate = ev.guest_count ? Math.round((ev.checked_in_count / ev.guest_count) * 100) : 0
  const projected = ev.checked_in_count ? nearNum(ev.deposit) * (ev.guest_count / ev.checked_in_count) : nearNum(ev.deposit)
  const qr = ticket && account ? JSON.stringify({ e: eventId, g: account, t: ticket }) : null
  const shareUrl = `${location.origin}/e/${eventId}`
  const seed = SEED_TXS[eventId]

  const run = async (label: string, fn: () => Promise<string>) => {
    setError(null)
    if (!account) return connect()
    setBusy(true)
    try {
      const h = await fn()
      setLastTx(h)
      toast(`${label} confirmed on NEAR`, 'ok')
      await load()
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err)
      setError(m)
      toast(m, 'err')
    } finally {
      setBusy(false)
    }
  }
  const onDeposit = () =>
    run('Deposit', async () => {
      const secret = crypto.randomUUID().replace(/-/g, '')
      localStorage.setItem(ticketKey(eventId, account!), secret)
      setTicket(secret)
      return callMethod('deposit', { event_id: eventId, ticket: secret }, ev.deposit)
    })
  const share = async () => {
    if (navigator.share) await navigator.share({ title: ev.title, url: shareUrl }).catch(() => {})
    else { await navigator.clipboard.writeText(shareUrl); toast('Link copied', 'ok') }
  }

  return (
    <div className="page ev">
      <div className="ev-hero reveal">
        <Cover kind={ev.cover || ev.title} className="ev-cover" />
        <div className="ev-hero-over">
          <PhaseBadge ev={ev} />
          <span className="badge">{ev.category || 'Event'}</span>
        </div>
      </div>
      <div className="ev-grid">
        <div className="ev-main">
          <h1 className="reveal">{ev.title}</h1>
          <div className="ev-facts reveal">
            <div><span>When</span><b>{fmtDate(ev.starts_ms)}</b></div>
            <div><span>Where</span><b>{ev.location || 'TBA'}</b></div>
            <div><span>Host</span><b><a href={`${ACCOUNT_EXPLORER}/${ev.host}`} target="_blank" rel="noreferrer">{shortAccount(ev.host)}</a></b></div>
            <div><span>Check-in closes</span><b>{fmtDate(ev.check_in_deadline_ms)}</b></div>
          </div>
          {ev.description && <p className="ev-desc reveal">{ev.description}</p>}

          <div className="card reveal">
            <div className="card-head">
              <h3>Who’s pulling up <span className="muted">· {ev.guest_count}{ev.capacity ? `/${ev.capacity}` : ''}</span></h3>
              <span className="live-dot"><i className="pulse" /> live</span>
            </div>
            <div className="bar big"><i style={{ width: `${rate}%` }} /></div>
            <div className="muted small">{ev.checked_in_count} checked in · {ev.guest_count - ev.checked_in_count} {ev.closed ? 'flaked' : 'yet to arrive'}</div>
            <ul className="guests">
              {guests.map(([g, s]) => (
                <li key={g} className={g === account ? 'me' : ''}>
                  <Avatar id={g} />
                  <a href={`${ACCOUNT_EXPLORER}/${g}`} target="_blank" rel="noreferrer">{shortAccount(g)}</a>
                  {g === account && <span className="badge">you</span>}
                  <span className={`status status-${STATUS[s][1]}`}>{STATUS[s][0]}</span>
                </li>
              ))}
              {!guests.length && <li className="muted">No RSVPs yet. Be the first.</li>}
            </ul>
          </div>
          {seed && (
            <div className="card reveal">
              <h3>On-chain receipts</h3>
              <div className="receipts">
                {seed.map(([k, h]) => <a key={h} href={txUrl(h)} target="_blank" rel="noreferrer" className="receipt"><span>{k}</span><code>{h.slice(0, 10)}…</code></a>)}
              </div>
            </div>
          )}
        </div>

        <aside className="ev-side">
          <div className="card sticky reveal">
            <div className="stake">
              <span className="muted small">Stake to RSVP</span>
              <b>{fmtNear(ev.deposit, 4)}</b>
            </div>
            {phase === 'upcoming' && <div className="cd">Starts in <Countdown to={ev.starts_ms} /></div>}
            {phase === 'live' && <div className="cd live">Doors close in <Countdown to={ev.check_in_deadline_ms} /></div>}
            {!ev.closed && <div className="muted small">If everyone checked in now, you’d get back <b>{projected.toFixed(3)} NEAR</b>.</div>}
            {ev.closed && <div className="result"><span>Each attendee received</span><b>{fmtNear(ev.payout_per_attendee, 4)}</b><span className="muted small">{rate}% show-up rate{ev.refund_mode ? ' · refund mode' : ''}</span></div>}

            {!mine && !isHost && !ev.closed && phase !== 'settling' && (
              <button className="btn btn-lg w100" disabled={busy} onClick={onDeposit}>{busy ? 'Confirm in wallet…' : account ? `Stake ${fmtNear(ev.deposit, 4)} & RSVP` : 'Connect wallet to RSVP'}</button>
            )}
            {mine && qr && mine === 'Deposited' && (
              <div className="qr-ticket">
                <div className="qr-wrap"><QRCodeSVG value={qr} size={188} bgColor="#ffffff" fgColor="#14132A" level="M" /></div>
                <div className="mono small">YOUR TICKET · show at the door</div>
              </div>
            )}
            {mine === 'Deposited' && !qr && <p className="muted small">You’re in. Your QR lives on the device you RSVP’d from.</p>}
            {mine === 'CheckedIn' && !ev.closed && <div className="okbox"><Mascot size={54} mood="cheer" /> You pulled up! Claim opens when the host closes.</div>}
            {ev.closed && mine && mine !== 'Claimed' && (mine === 'CheckedIn' || ev.refund_mode) && (
              <button className="btn btn-lg w100" disabled={busy} onClick={() => run('Claim', () => callMethod('claim', { event_id: eventId }))}>Claim {fmtNear(ev.payout_per_attendee, 4)}</button>
            )}
            {mine === 'Claimed' && <div className="okbox">✓ Paid out. Never flake.</div>}
            {isHost && !ev.closed && (
              <div className="host-tools">
                <Link className="btn w100" to={`/e/${eventId}/scan`}>Open door scanner</Link>
                <button className="btn btn-ghost w100" disabled={busy} onClick={() => run('Close', () => callMethod('close', { event_id: eventId }))}>Close & settle</button>
              </div>
            )}
            {!isHost && phase === 'settling' && (
              <button className="btn btn-ghost w100" disabled={busy} onClick={() => run('Close', () => callMethod('close', { event_id: eventId }))}>Settle event (anyone can)</button>
            )}
            <button className="btn btn-ghost w100" onClick={share}>Share event ↗</button>
            {lastTx && <a className="small" href={txUrl(lastTx)} target="_blank" rel="noreferrer">Last tx {lastTx.slice(0, 10)}… ↗</a>}
            {error && <div className="error small">{error}</div>}
          </div>
        </aside>
      </div>
    </div>
  )
}
