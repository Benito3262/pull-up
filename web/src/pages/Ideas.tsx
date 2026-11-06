import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { PageHead, useToast } from '../components/UI'

export const TEMPLATES = [
  { id: 'run', title: 'Saturday Run Club', category: 'Fitness', cover: 'trail', deposit: '0.1', description: 'Easy 5K, every pace welcome. No-shows buy the post-run coffee.', why: 'Early mornings are where flaking peaks. A stake gets people out of bed.', rate: 'High' },
  { id: 'study', title: 'Paper Club', category: 'Study group', cover: 'night', deposit: '0.1', description: 'One paper a week, one hour, cameras on. Read it before you come.', why: 'Weekly groups die from slow drop-off. Stakes keep the core group showing up.', rate: 'High' },
  { id: 'watch', title: 'Demo Day Watch Party', category: 'Watch party', cover: 'stage', deposit: '0.05', description: 'Watch the demos live together, vote on favourites, chat after.', why: 'Free online events get a lot of RSVPs and few attendees. A tiny stake fixes the ratio.', rate: 'Medium' },
  { id: 'cowork', title: 'Deep Work Sprint', category: 'Co-working', cover: 'studio', deposit: '0.15', description: 'Three 50-minute focus blocks. Phones away. Show up, ship something.', why: 'Accountability is the product, and the stake makes it real.', rate: 'High' },
  { id: 'dinner', title: 'Builders Dinner (12 seats)', category: 'Social', cover: 'brunch', deposit: '0.25', description: 'Long table, 12 builders, one topic. Seats are held by stake.', why: 'Restaurants charge for empty seats. Now no-shows pay for them instead of the host.', rate: 'Very high' },
  { id: 'workshop', title: 'Ship Your First Contract', category: 'Workshop', cover: 'code', deposit: '0.1', description: 'Go from zero to a deployed NEAR testnet contract in 90 minutes.', why: 'Workshops have limited mentor time. Stakes keep the seats for people who show.', rate: 'High' },
]

type Sug = { id: number; title: string; city: string; votes: number }
const SEEDED: Sug[] = [
  { id: 1, title: 'Sunrise yoga + coffee', city: 'Lisbon', votes: 0 },
  { id: 2, title: 'Rust contract code review night', city: 'Online', votes: 0 },
  { id: 3, title: 'Board game café takeover', city: 'Berlin', votes: 0 },
  { id: 4, title: 'Open-mic for founders', city: 'London', votes: 0 },
]

export function Ideas() {
  const toast = useToast()
  const [list, setList] = useState<Sug[]>(() => JSON.parse(localStorage.getItem('pu-sugs') || 'null') || SEEDED)
  const [voted, setVoted] = useState<number[]>(() => JSON.parse(localStorage.getItem('pu-voted') || '[]'))
  const [t, setT] = useState('')
  const [c, setC] = useState('')
  const save = (l: Sug[], v = voted) => { setList(l); localStorage.setItem('pu-sugs', JSON.stringify(l)); localStorage.setItem('pu-voted', JSON.stringify(v)) }
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!t.trim()) return
    save([{ id: Date.now(), title: t.trim(), city: c.trim() || 'Anywhere', votes: 1 }, ...list])
    setT(''); setC(''); toast('Suggestion added. Hosts can pick it up.', 'ok')
  }
  const vote = (id: number) => {
    if (voted.includes(id)) return
    const v = [...voted, id]; setVoted(v)
    save(list.map((s) => (s.id === id ? { ...s, votes: s.votes + 1 } : s)), v)
  }
  return (
    <div className="page">
      <PageHead eyebrow="Ideas" title="Events that work better with a stake" sub="Templates for formats where flaking hurts the most. Pick one and it fills in the host form for you." />
      <div className="grid3">
        {TEMPLATES.map((x) => (
          <div className="ecard tpl reveal" key={x.id}>
            <div className="ecard-cover"><Cover kind={x.cover} /><span className="ecard-dep">{x.deposit} NEAR suggested</span></div>
            <div className="ecard-body">
              <div className="ecard-cat">{x.category} · flake risk: {x.rate}</div>
              <h3>{x.title}</h3>
              <p className="muted small">{x.why}</p>
              <Link className="btn btn-sm" to={`/create?t=${x.id}`}>Use template →</Link>
            </div>
          </div>
        ))}
      </div>
      <section className="section">
        <div className="sec-head reveal"><div><div className="eyebrow">Community board</div><h2>Suggest an event</h2><p className="muted">Tell hosts what you’d pull up to. Upvote the ones you’d stake on. Starter ideas are examples; posts and votes are saved on this device.</p></div></div>
        <div className="sug">
          <form className="card form reveal" onSubmit={add}>
            <label>What should someone host?<input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. Night photo walk" maxLength={80} /></label>
            <label>Where?<input className="input" value={c} onChange={(e) => setC(e.target.value)} placeholder="City or Online" maxLength={40} /></label>
            <button className="btn w100">Post suggestion</button>
          </form>
          <ul className="sug-list reveal">
            {[...list].sort((a, b) => b.votes - a.votes).map((s) => (
              <li key={s.id}>
                <button className={`vote ${voted.includes(s.id) ? 'on' : ''}`} onClick={() => vote(s.id)} aria-label="Upvote">▲<b>{s.votes}</b></button>
                <div><b>{s.title}</b><span className="muted small"> · {s.city}</span></div>
                <Link className="link-arrow small" to="/create">Host it →</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
