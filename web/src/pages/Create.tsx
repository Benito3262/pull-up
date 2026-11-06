import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { callMethod, parseNear, txUrl, viewMethod } from '../lib/near'
import { nearToYocto } from '../lib/config'
import { useAccount } from '../components/WalletButton'
import { getModal } from '../lib/near'

export function Create() {
  const account = useAccount()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [depositNear, setDepositNear] = useState('0.1')
  const [hours, setHours] = useState('2')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tx, setTx] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!account) {
      ;(await getModal()).show()
      return
    }
    setBusy(true)
    try {
      const deadline = Date.now() + Math.max(0.05, parseFloat(hours)) * 3600_000
      const deposit = nearToYocto(depositNear)
      const hash = await callMethod(
        'create_event',
        {
          title: title.trim(),
          deposit,
          check_in_deadline_ms: Math.floor(deadline),
        },
        parseNear('0.05'),
      )
      setTx(hash)
      // next id is unknown without view; poll get_next_event_id - 1
      const next = await viewMethod<number>('get_next_event_id', {})
      const id = next - 1
      nav(`/e/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1>New event</h1>
      <p className="lede">Set the stake. Share the link. Scan at the door.</p>
      <form className="card" onSubmit={onSubmit}>
        {error && <div className="error">{error}</div>}
        <label htmlFor="title">Title</label>
        <input
          id="title"
          required
          maxLength={120}
          placeholder="Friday rooftop"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="deposit">Deposit (NEAR)</label>
        <input
          id="deposit"
          required
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={depositNear}
          onChange={(e) => setDepositNear(e.target.value)}
        />
        <label htmlFor="hours">Check-in open for (hours)</label>
        <input
          id="hours"
          required
          inputMode="decimal"
          min="0.05"
          step="0.05"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Host attaches 0.05 Ⓝ for storage. Guests must deposit the exact amount.
        </p>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Confirm in wallet…' : account ? 'Create event' : 'Connect to create'}
        </button>
        {tx && (
          <p className="muted" style={{ marginTop: 12 }}>
            Tx: <a href={txUrl(tx)} target="_blank" rel="noreferrer">{tx.slice(0, 12)}…</a>
          </p>
        )}
      </form>
    </div>
  )
}
