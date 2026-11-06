import { Link } from 'react-router-dom'
import { useAccount, connect } from '../components/WalletButton'
import { Mascot } from '../components/Brand'
import { Empty, PageHead, PhaseBadge } from '../components/UI'
import { fmtNear, nearNum, phaseOf, useEvents } from '../lib/data'

export function Host() {
  const account = useAccount()
  const { data } = useEvents()
  if (!account)
    return (
      <div className="page center">
        <Mascot size={150} mood="cheer" />
        <h1>Host dashboard</h1>
        <p className="lede">Connect the wallet you host with to manage events, scan guests and settle payouts.</p>
        <button className="btn btn-lg" onClick={connect}>Connect wallet</button>
      </div>
    )
  const mine = (data || []).filter((e) => e.host === account).sort((a, b) => b.id - a.id)
  const guests = mine.reduce((a, e) => a + e.guest_count, 0)
  const ins = mine.reduce((a, e) => a + e.checked_in_count, 0)
  const staked = mine.reduce((a, e) => a + nearNum(e.total_pot), 0)
  return (
    <div className="page">
      <PageHead eyebrow="Host dashboard" title="Your events" sub={account}>
        <Link to="/create" className="btn">+ New event</Link>
      </PageHead>
      <div className="stats small-stats reveal">
        <div className="stat"><span className="stat-n">{mine.length}</span><span>events</span></div>
        <div className="stat"><span className="stat-n">{guests}</span><span>RSVPs</span></div>
        <div className="stat"><span className="stat-n">{guests ? Math.round((ins / guests) * 100) : 0}%</span><span>show-up</span></div>
        <div className="stat"><span className="stat-n">{staked.toFixed(2)} NEAR</span><span>staked by guests</span></div>
      </div>
      <div className="card table reveal">
        <div className="tr th host"><span>Event</span><span>Status</span><span>Guests</span><span>Checked in</span><span>Stake</span><span /></div>
        {mine.map((e) => (
          <div className="tr host" key={e.id}>
            <Link to={`/e/${e.id}`}><b>{e.title}</b></Link>
            <PhaseBadge ev={e} />
            <span>{e.guest_count}{e.capacity ? `/${e.capacity}` : ''}</span>
            <span>{e.checked_in_count}</span>
            <span className="mono">{fmtNear(e.deposit, 3)}</span>
            {!e.closed && phaseOf(e) !== 'upcoming' ? <Link className="btn btn-sm" to={`/e/${e.id}/scan`}>Scan</Link> : <Link className="btn btn-sm btn-ghost" to={`/e/${e.id}`}>View</Link>}
          </div>
        ))}
      </div>
      {data && !mine.length && <Empty title="You haven’t hosted yet"><Link to="/ideas" className="btn">Browse event ideas</Link></Empty>}
    </div>
  )
}
