import { useMemo, useState } from 'react'
import { CardSkeleton, Empty, EventCard, PageHead } from '../components/UI'
import { filterPublicEvents, nearNum, phaseOf, useEvents } from '../lib/data'
import { Link } from 'react-router-dom'

export function Explore() {
  const { data, error } = useEvents()
  const [when, setWhen] = useState<'all' | 'live' | 'upcoming'>('all')
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'soon' | 'popular' | 'stake'>('soon')
  const open = filterPublicEvents(data).filter((e) => ['live', 'upcoming'].includes(phaseOf(e)))
  const cats = ['All', ...Array.from(new Set(open.map((e) => e.category).filter(Boolean)))]
  const list = useMemo(() => {
    let l = open.filter((e) => (when === 'all' || phaseOf(e) === when) && (cat === 'All' || e.category === cat))
    if (q) l = l.filter((e) => `${e.title} ${e.location} ${e.description}`.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'soon') l.sort((a, b) => a.starts_ms - b.starts_ms)
    if (sort === 'popular') l.sort((a, b) => b.guest_count - a.guest_count)
    if (sort === 'stake') l.sort((a, b) => nearNum(b.deposit) - nearNum(a.deposit))
    return l
  }, [open, when, cat, q, sort])

  return (
    <div className="page">
      <PageHead eyebrow="Explore" title="Events worth pulling up to" sub="Live and upcoming events on NEAR. Stake to RSVP, show up to earn." />
      <div className="filters reveal">
        <div className="seg">
          {(['all', 'live', 'upcoming'] as const).map((w) => (
            <button key={w} className={when === w ? 'on' : ''} onClick={() => setWhen(w)}>{w === 'all' ? 'All' : w === 'live' ? '● Live' : 'Upcoming'}</button>
          ))}
        </div>
        <input className="input search" placeholder="Search events, cities…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="soon">Soonest</option>
          <option value="popular">Most going</option>
          <option value="stake">Highest stake</option>
        </select>
      </div>
      <div className="chips reveal">{cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div>
      {error && <div className="error">{error}</div>}
      <div className="grid3">
        {!data ? <CardSkeleton n={6} /> : list.map((e) => <EventCard key={e.id} ev={e} />)}
      </div>
      {data && !list.length && <Empty title="Nothing matches yet"><p className="muted">Be the first — <Link to="/create">host this event</Link>.</p></Empty>}
    </div>
  )
}
