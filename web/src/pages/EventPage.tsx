import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  callMethod,
  getModal,
  txUrl,
  viewMethod,
} from '../lib/near'
import type { EventView, GuestStatus } from '../lib/near'
import { shortAccount, yoctoToNear, ACCOUNT_EXPLORER } from '../lib/config'
import { useAccount } from '../components/WalletButton'

function ticketKey(eventId: string, account: string) {
  return `pullup:ticket:${eventId}:${account}`
}

function statusPill(s: GuestStatus) {
  if (s === 'CheckedIn') return <span className="pill">Pulled up</span>
  if (s === 'Claimed') return <span className="pill muted">Claimed</span>
  return <span className="pill warn">Deposited</span>
}

export function EventPage() {
  const { id } = useParams()
  const account = useAccount()
  const eventId = Number(id)
  const [ev, setEv] = useState<EventView | null>(null)
  const [guests, setGuests] = useState<[string, GuestStatus][]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastTx, setLastTx] = useState<string | null>(null)
  const [ticket, setTicket] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(eventId)) return
    const [e, g] = await Promise.all([
      viewMethod<EventView>('get_event', { event_id: eventId }),
      viewMethod<[string, GuestStatus][]>('list_guests', { event_id: eventId }),
    ])
    setEv(e)
    setGuests(g)
  }, [eventId])

  useEffect(() => {
    load().catch((e) => setError(String(e)))
    const t = setInterval(() => load().catch(() => {}), 8000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!account || !id) return
    setTicket(localStorage.getItem(ticketKey(id, account)))
  }, [account, id])

  const myStatus = useMemo(() => {
    if (!account) return null
    return guests.find(([a]) => a === account)?.[1] ?? null
  }, [account, guests])

  const isHost = account && ev && account === ev.host
  const deadline = ev ? new Date(ev.check_in_deadline_ms) : null
  const qrPayload = ticket && account && id
    ? JSON.stringify({ e: Number(id), g: account, t: ticket })
    : null

  const run = async (fn: () => Promise<string>) => {
    setError(null)
    if (!account) {
      ;(await getModal()).show()
      return
    }
    setBusy(true)
    try {
      const hash = await fn()
      setLastTx(hash)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const onDeposit = () =>
    run(async () => {
      const secret = crypto.randomUUID().replace(/-/g, '')
      const hash = await callMethod(
        'deposit',
        { event_id: eventId, ticket: secret },
        ev!.deposit,
      )
      localStorage.setItem(ticketKey(String(eventId), account!), secret)
      setTicket(secret)
      return hash
    })

  const onClose = () => run(() => callMethod('close', { event_id: eventId }, '0'))
  const onClaim = () => run(() => callMethod('claim', { event_id: eventId }, '0'))

  if (!ev) {
    return (
      <div className="card">
        {error ? <div className="error">{error}</div> : <p className="muted">Loading event…</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="pill muted">Event #{ev.id}</span>
        {ev.closed ? <span className="pill">Closed</span> : <span className="pill">Open</span>}
      </div>
      <h1>{ev.title}</h1>
      <p className="lede">
        Host{' '}
        <a href={`${ACCOUNT_EXPLORER}/${ev.host}`} target="_blank" rel="noreferrer">
          {shortAccount(ev.host)}
        </a>
        {' · '}
        deposit <strong>{yoctoToNear(ev.deposit)} Ⓝ</strong>
        {deadline && (
          <>
            {' · '}check-in until{' '}
            {deadline.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </>
        )}
      </p>

      {error && <div className="error">{error}</div>}

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="n">{ev.guest_count}</div>
          <div className="l">Deposits</div>
        </div>
        <div className="stat">
          <div className="n">{ev.checked_in_count}</div>
          <div className="l">Pulled up</div>
        </div>
        <div className="stat">
          <div className="n">{yoctoToNear(ev.total_pot)}</div>
          <div className="l">Pot (Ⓝ)</div>
        </div>
      </div>

      <div className="card">
        <h2>Your move</h2>
        {!account && (
          <button className="btn" type="button" onClick={async () => (await getModal()).show()}>
            Connect wallet
          </button>
        )}
        {account && !isHost && !myStatus && !ev.closed && (
          <button className="btn" type="button" disabled={busy} onClick={onDeposit}>
            {busy ? 'Confirm…' : `Deposit ${yoctoToNear(ev.deposit)} Ⓝ`}
          </button>
        )}
        {account && myStatus === 'Deposited' && qrPayload && (
          <div className="qr-wrap">
            <QRCodeSVG value={qrPayload} size={200} level="M" includeMargin />
            <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
              Show this at the door. Only the host can check you in.
            </p>
          </div>
        )}
        {account && myStatus === 'CheckedIn' && !ev.closed && (
          <p className="muted">You're in. Wait for the host to close, then claim.</p>
        )}
        {account && ev.closed && (myStatus === 'CheckedIn' || myStatus === 'Deposited') && (
          <div className="stack">
            <p className="muted" style={{ margin: 0 }}>
              Payout:{' '}
              <strong>
                {yoctoToNear(
                  myStatus === 'CheckedIn' || Number(ev.checked_in_count) === 0
                    ? ev.payout_per_attendee
                    : '0',
                )}{' '}
                Ⓝ
              </strong>
              {myStatus === 'Deposited' && Number(ev.checked_in_count) > 0 && (
                <> — no-shows don't claim when someone pulled up.</>
              )}
            </p>
            {(myStatus === 'CheckedIn' || Number(ev.checked_in_count) === 0) && (
              <button className="btn" type="button" disabled={busy} onClick={onClaim}>
                {busy ? 'Confirm…' : 'Claim'}
              </button>
            )}
          </div>
        )}
        {myStatus === 'Claimed' && <p className="muted">Already claimed. Nice.</p>}
        {isHost && (
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn ghost" to={`/e/${ev.id}/scan`}>
              Open scanner
            </Link>
            {!ev.closed && (
              <button className="btn secondary" type="button" disabled={busy} onClick={onClose}>
                Close & settle
              </button>
            )}
          </div>
        )}
        {lastTx && (
          <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
            Last tx:{' '}
            <a href={txUrl(lastTx)} target="_blank" rel="noreferrer">
              {lastTx.slice(0, 14)}…
            </a>
          </p>
        )}
      </div>

      <div className="card">
        <h2>Guest list</h2>
        {guests.length === 0 ? (
          <p className="muted">Nobody yet. Share this page.</p>
        ) : (
          <ul className="guest-list">
            {guests.map(([g, s]) => (
              <li key={g}>
                <span className="mono">{shortAccount(g)}</span>
                {statusPill(s)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ev.closed && (
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Settled payout per attendee: {yoctoToNear(ev.payout_per_attendee)} Ⓝ
        </p>
      )}
    </div>
  )
}
