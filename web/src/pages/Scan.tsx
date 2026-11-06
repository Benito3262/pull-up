import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { callMethod, getModal, txUrl, viewMethod } from '../lib/near'
import { useToast } from '../components/UI'
import type { EventView } from '../lib/near'
import { useAccount } from '../components/WalletButton'

type Payload = { e: number; g: string; t: string }

export function Scan() {
  const { id } = useParams()
  const account = useAccount()
  const eventId = Number(id)
  const [ev, setEv] = useState<EventView | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tx, setTx] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const scanning = useRef(false)
  const lastCode = useRef('')
  const toast = useToast()
  const [guests, setGuests] = useState<[string, string][]>([])
  useEffect(() => {
    const l = () => viewMethod<[string, string][]>('list_guests', { event_id: eventId }).then(setGuests).catch(() => {})
    l(); const t = setInterval(l, 5000); return () => clearInterval(t)
  }, [eventId])

  useEffect(() => {
    viewMethod<EventView>('get_event', { event_id: eventId })
      .then(setEv)
      .catch((e) => setError(String(e)))
  }, [eventId])

  useEffect(() => {
    if (!account || !ev || account !== ev.host) return
    const elId = 'pullup-qr-reader'
    const scanner = new Html5Qrcode(elId)
    let stopped = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          if (scanning.current || decoded === lastCode.current) return
          lastCode.current = decoded
          scanning.current = true
          try {
            const data = JSON.parse(decoded) as Payload
            if (data.e !== eventId) throw new Error('Wrong event QR')
            setBusy(true)
            setError(null)
            const hash = await callMethod(
              'check_in',
              { event_id: eventId, guest: data.g, ticket: data.t },
              '0',
            )
            setTx(hash)
            setMsg(`Checked in ${data.g}`)
            toast(`✓ ${data.g} pulled up`, 'ok')
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
          } finally {
            setBusy(false)
            setTimeout(() => {
              scanning.current = false
            }, 1500)
          }
        },
        () => {},
      )
      .catch((e) => setError(`Camera: ${e}`))

    return () => {
      stopped = true
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
      void stopped
    }
  }, [account, ev, eventId])

  if (ev && account && account !== ev.host) {
    return (
      <div className="card">
        <p className="error">Only the host can scan check-ins.</p>
        <Link to={`/e/${eventId}`}>Back to event</Link>
      </div>
    )
  }

  return (
    <div className="page scan">
      <div className="eyebrow">Host · Event #{eventId}</div>
      <h1>Door scanner</h1>
      {ev && <p className="muted">{ev.title} · {guests.filter(([, s]) => s !== 'Deposited').length}/{guests.length} checked in</p>}
      <p className="lede">Point at a guest QR. Check-in is an on-chain call from your wallet.</p>
      {!account && (
        <button className="btn btn-lg" type="button" onClick={async () => (await getModal()).show()}>
          Connect host wallet
        </button>
      )}
      {error && <div className="error">{error}</div>}
      {msg && <p className="okbox">{msg}</p>}
      {busy && <p className="muted">Confirm check-in in your wallet…</p>}
      <div className="card">
        <div id="pullup-qr-reader" className="scanner" />
      </div>
      {tx && (
        <p className="muted">
          Tx:{' '}
          <a href={txUrl(tx)} target="_blank" rel="noreferrer">
            {tx.slice(0, 14)}…
          </a>
        </p>
      )}
      <ul className="guests">{guests.map(([g, s]) => <li key={g}>{g}<span className={`status status-${s === 'Deposited' ? 'warn' : 'ok'}`}>{s === 'Deposited' ? 'Waiting' : 'In'}</span></li>)}</ul>
      <Link to={`/e/${eventId}`}>← Event</Link>
    </div>
  )
}
