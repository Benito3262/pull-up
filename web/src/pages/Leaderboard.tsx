import { useEffect, useState } from 'react'
import { Mascot } from '../components/Brand'
import { Avatar, PageHead } from '../components/UI'
import { fetchAllGuests, useEvents } from '../lib/data'
import { ACCOUNT_EXPLORER, shortAccount } from '../lib/config'

type Row = { id: string; rsvps: number; came: number; flaked: number; streak: number }

export function Leaderboard() {
  const { data: events } = useEvents()
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    if (!events) return
    const settled = events.filter((e) => e.closed).sort((a, b) => a.id - b.id)
    fetchAllGuests(events).then((all) => {
      const m: Record<string, Row> = {}
      const get = (id: string) => (m[id] ||= { id, rsvps: 0, came: 0, flaked: 0, streak: 0 })
      for (const e of events) for (const [g, s] of all[e.id] || []) {
        const r = get(g); r.rsvps++
        if (s !== 'Deposited') r.came++
      }
      for (const e of settled) for (const [g, s] of all[e.id] || []) {
        const r = get(g)
        if (s === 'Deposited') { r.flaked++; r.streak = 0 } else r.streak++
      }
      setRows(Object.values(m).sort((a, b) => b.streak - a.streak || b.came - a.came || a.flaked - b.flaked))
    })
  }, [events])
  const top = rows?.slice(0, 3) || []
  return (
    <div className="page">
      <PageHead eyebrow="Leaderboard" title={<>Never flakes. <span className="grad">Ever.</span></>} sub="Ranked by settled-event show-up streak, computed live from every guest list on the contract." />
      <div className="podium reveal">
        {[1, 0, 2].map((i) => top[i] && (
          <div key={top[i].id} className={`pod pod-${i + 1}`}>
            {i === 0 && <Mascot size={70} mood="cheer" />}
            <Avatar id={top[i].id} size={i === 0 ? 64 : 50} />
            <b>{shortAccount(top[i].id)}</b>
            <span className="mono">🔥 {top[i].streak} streak</span>
            <div className="pod-block">{i + 1}</div>
          </div>
        ))}
      </div>
      <div className="card table reveal">
        <div className="tr th"><span>#</span><span>Account</span><span>Streak</span><span>Pulled up</span><span>Flaked</span><span>Reliability</span></div>
        {!rows && [0, 1, 2, 3].map((i) => <div key={i} className="tr"><i className="line shimmer" style={{ gridColumn: '1/-1' }} /></div>)}
        {rows?.map((r, i) => {
          const rel = r.came + r.flaked ? Math.round((r.came / (r.came + r.flaked)) * 100) : 0
          return (
            <div className="tr" key={r.id}>
              <span className="mono">{i + 1}</span>
              <a href={`${ACCOUNT_EXPLORER}/${r.id}`} target="_blank" rel="noreferrer" className="acct"><Avatar id={r.id} size={24} />{shortAccount(r.id)}</a>
              <span className="mono">🔥 {r.streak}</span>
              <span>{r.came}</span>
              <span className={r.flaked ? 'bad' : ''}>{r.flaked}</span>
              <span><div className="bar"><i style={{ width: `${rel}%` }} /></div><small className="mono">{r.came + r.flaked ? `${rel}%` : 'new'}</small></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
