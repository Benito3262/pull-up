import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { callMethod, parseNear, viewMethod } from '../lib/near'
import { Cover, COVERS } from '../components/Cover'
import { PageHead, useToast } from '../components/UI'
import { useAccount, connect } from '../components/WalletButton'
import { TEMPLATES } from './Ideas'

const CATS = ['Meetup', 'Workshop', 'Watch party', 'Fitness', 'Study group', 'Co-working', 'Social', 'Other']
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export function Create() {
  const account = useAccount()
  const nav = useNavigate()
  const toast = useToast()
  const [sp] = useSearchParams()
  const tpl = TEMPLATES.find((t) => t.id === sp.get('t'))
  const [f, setF] = useState({
    title: tpl?.title || '', description: tpl?.description || '', category: tpl?.category || 'Meetup', location: '',
    cover: tpl?.cover || 'sunrise', deposit: tpl?.deposit || '0.1', capacity: '30',
    starts: local(new Date(Date.now() + 86400000)), hours: '3',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { if (tpl) toast(`Template loaded: ${tpl.title}`, 'info') }, [tpl, toast])
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return connect()
    setBusy(true); setErr(null)
    try {
      const starts = new Date(f.starts).getTime()
      const deadline = starts + Number(f.hours) * 3600000
      const next = await viewMethod<number>('get_next_event_id')
      await callMethod('create_event', {
        title: f.title.trim(), deposit: parseNear(f.deposit), check_in_deadline_ms: deadline,
        meta: { description: f.description, category: f.category, location: f.location, cover: f.cover, starts_ms: starts, capacity: Number(f.capacity) || 0 },
      }, parseNear('0.05'), '100000000000000')
      toast('Event created on NEAR', 'ok')
      nav(`/e/${next}`)
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x))
    } finally { setBusy(false) }
  }

  return (
    <div className="page">
      <PageHead eyebrow="Host" title="Host an event" sub="Set a small stake. Guests who show up split whatever the no-shows leave behind. You never touch the pot." />
      <div className="create">
        <form className="card form reveal" onSubmit={submit}>
          <label>Event name<input className="input" required maxLength={120} value={f.title} onChange={set('title')} placeholder="Sunday Run Club" /></label>
          <label>Description<textarea className="input" rows={3} maxLength={1000} value={f.description} onChange={set('description')} placeholder="What should people expect?" /></label>
          <div className="two">
            <label>Category<select className="input" value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Location<input className="input" maxLength={120} value={f.location} onChange={set('location')} placeholder="City · venue, or Online" /></label>
          </div>
          <div className="two">
            <label>Starts<input className="input" type="datetime-local" value={f.starts} onChange={set('starts')} /></label>
            <label>Check-in window (hours)<input className="input" type="number" min="1" max="72" value={f.hours} onChange={set('hours')} /></label>
          </div>
          <div className="two">
            <label>Stake per guest ( NEAR)<input className="input" type="number" step="0.01" min="0.01" value={f.deposit} onChange={set('deposit')} /></label>
            <label>Capacity (0 = unlimited)<input className="input" type="number" min="0" value={f.capacity} onChange={set('capacity')} /></label>
          </div>
          <div>
            <div className="lbl">Cover</div>
            <div className="cover-pick">
              {COVERS.map((c) => (
                <button type="button" key={c} className={f.cover === c ? 'on' : ''} onClick={() => setF({ ...f, cover: c })} aria-label={c}><Cover kind={c} /></button>
              ))}
            </div>
          </div>
          <button className="btn btn-lg w100" disabled={busy}>{busy ? 'Confirm in wallet…' : account ? 'Create event (0.05 NEAR storage)' : 'Connect wallet to create'}</button>
          {err && <div className="error">{err}</div>}
        </form>
        <div className="preview reveal">
          <div className="lbl">Live preview</div>
          <div className="ecard static">
            <div className="ecard-cover"><Cover kind={f.cover} /><span className="badge badge-upcoming">Upcoming</span><span className="ecard-dep">{f.deposit || '0'} NEAR stake</span></div>
            <div className="ecard-body">
              <div className="ecard-cat">{f.category} · {f.location || 'Location'}</div>
              <h3>{f.title || 'Your event name'}</h3>
              <div className="ecard-meta">{new Date(f.starts).toLocaleString()}</div>
            </div>
          </div>
          <div className="card tip"><b>Tip:</b> 0.05–0.25 NEAR is the sweet spot: enough to make people commit, small enough that nobody hesitates.</div>
        </div>
      </div>
    </div>
  )
}
