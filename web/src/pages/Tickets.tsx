import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAccount, connect } from '../components/WalletButton'
import { Mascot } from '../components/Brand'
import { Avatar, Empty, PageHead, PhaseBadge, fmtDate } from '../components/UI'
import { Cover } from '../components/Cover'
import { fetchAllGuests, fmtNear, useEvents } from '../lib/data'
import type { EventView, GuestStatus } from '../lib/near'
import { ticketKey } from './EventPage'

export function Tickets() {
  const account = useAccount()
  const { data: events } = useEvents()
  const [mine, setMine] = useState<[EventView, GuestStatus][] | null>(null)
  useEffect(() => {
    if (!account || !events) return
    fetchAllGuests(events).then((all) => {
      setMine(events.flatMap((e) => { const s = (all[e.id] || []).find(([g]) => g === account); return s ? [[e, s[1]] as [EventView, GuestStatus]] : [] }))
    })
  }, [account, events])
  if (!account)
    return (
      <div className="page center">
        <Mascot size={160} mood="wave" />
        <h1>Your tickets live in your wallet</h1>
        <p className="lede">Connect a NEAR testnet wallet to see your RSVPs, QR tickets and payouts.</p>
        <button className="btn btn-lg" onClick={connect}>Connect wallet</button>
      </div>
    )
  const came = mine?.filter(([, s]) => s !== 'Deposited').length || 0
  return (
    <div className="page">
      <PageHead eyebrow="My tickets" title={<span className="row"><Avatar id={account} size={44} /> {account}</span>} sub={mine ? `${mine.length} RSVPs · ${came} pulled up` : 'Loading…'} />
      <div className="tickets">
        {mine?.map(([e, s]) => {
          const t = localStorage.getItem(ticketKey(e.id, account))
          return (
            <div className="tix reveal" key={e.id}>
              <Link to={`/e/${e.id}`} className="tix-cover"><Cover kind={e.cover || e.title} /></Link>
              <div className="tix-body">
                <PhaseBadge ev={e} />
                <h3><Link to={`/e/${e.id}`}>{e.title}</Link></h3>
                <div className="muted small">{fmtDate(e.starts_ms)} · {e.location}</div>
                <div className="mono small">Stake {fmtNear(e.deposit, 4)} · {s === 'Deposited' ? 'Staked' : s === 'CheckedIn' ? 'Pulled up ✓' : 'Paid out ✓'}</div>
              </div>
              <div className="tix-stub">{s === 'Deposited' && t && !e.closed ? <QRCodeSVG value={JSON.stringify({ e: e.id, g: account, t })} size={96} /> : <span className="mono">#{e.id}</span>}</div>
            </div>
          )
        })}
        {mine && !mine.length && <Empty title="No tickets yet"><Link className="btn" to="/explore">Find an event</Link></Empty>}
      </div>
    </div>
  )
}
