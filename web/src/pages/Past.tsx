import { Link } from 'react-router-dom'
import { Cover } from '../components/Cover'
import { Empty, PageHead, fmtDate } from '../components/UI'
import { fmtNear, nearNum, phaseOf, useEvents } from '../lib/data'
import { ACCOUNT_EXPLORER, CONTRACT_ID } from '../lib/config'

export function Past() {
  const { data } = useEvents()
  const past = (data || []).filter((e) => phaseOf(e) === 'past' || phaseOf(e) === 'settling').sort((a, b) => b.id - a.id)
  return (
    <div className="page">
      <PageHead eyebrow="Past events" title="Receipts, not promises" sub="Settled events with show-up rates and real payouts. Every number below is read live from the contract." />
      <div className="past-list">
        {!data && [0, 1, 2].map((i) => <div key={i} className="past-row skel"><div className="past-cover shimmer" /><div className="line shimmer" style={{ width: '50%' }} /></div>)}
        {past.map((e) => {
          const rate = e.guest_count ? Math.round((e.checked_in_count / e.guest_count) * 100) : 0
          const noShows = e.guest_count - e.checked_in_count
          const bonus = nearNum(e.payout_per_attendee) - nearNum(e.deposit)
          return (
            <div className="past-row reveal" key={e.id}>
              <Link to={`/e/${e.id}`} className="past-cover"><Cover kind={e.cover || e.title} /></Link>
              <div className="past-main">
                <div className="ecard-cat">{e.category} · {e.location} · {fmtDate(e.starts_ms)}</div>
                <h3><Link to={`/e/${e.id}`}>{e.title}</Link></h3>
                <div className="ring-row">
                  <div className="ring" style={{ ['--p' as string]: rate }}><span>{rate}%</span></div>
                  <div className="kv"><b>{e.checked_in_count}/{e.guest_count}</b><span>pulled up</span></div>
                  <div className="kv"><b>{noShows}</b><span>flaked</span></div>
                  <div className="kv"><b>{e.closed ? fmtNear(e.payout_per_attendee, 4) : '—'}</b><span>each attendee</span></div>
                  <div className="kv good"><b>{e.closed ? `+${bonus.toFixed(3)} NEAR` : 'pending'}</b><span>bonus</span></div>
                </div>
              </div>
              <a className="btn btn-ghost btn-sm" href={`${ACCOUNT_EXPLORER}/${CONTRACT_ID}`} target="_blank" rel="noreferrer">Explorer ↗</a>
            </div>
          )
        })}
        {data && !past.length && <Empty title="No settled events yet" />}
      </div>
    </div>
  )
}
