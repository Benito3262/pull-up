import { Link } from 'react-router-dom'
import { Mascot } from '../components/Brand'
import { CardSkeleton, EventCard, KIND_LABEL, Avatar } from '../components/UI'
import { fmtNear, nearNum, phaseOf, timeAgo, useActivity, useEvents, useNow, useStats } from '../lib/data'
import { useEffect, useState } from 'react'

function Count({ value, dp = 0, suffix = '' }: { value: number; dp?: number; suffix?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100)
      setV(value * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{v.toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: dp })}{suffix}</>
}

const STEPS = [
  { n: '01', t: 'Stake to RSVP', d: 'Guests lock a small NEAR deposit in the contract. Nobody holds the pot — not even the host.', ico: '◎' },
  { n: '02', t: 'Pull up & scan', d: 'At the door, the host scans your QR ticket. Check-in is an on-chain call.', ico: '▣' },
  { n: '03', t: 'No-shows fund the room', d: 'When the event closes, flakers’ deposits split evenly among everyone who came.', ico: '⇢' },
  { n: '04', t: 'Claim more than you put in', d: 'Attendees claim deposit + bonus. Nobody shows? Everyone gets refunded.', ico: '↑' },
]

export function Home() {
  const { data: events } = useEvents()
  const { data: stats } = useStats()
  const { data: act } = useActivity(6)
  const now = useNow(10000)
  const live = (events || []).filter((e) => phaseOf(e) === 'live')
  const upcoming = (events || []).filter((e) => phaseOf(e) === 'upcoming')
  const featured = [...live, ...upcoming].slice(0, 3)
  const closed = (events || []).filter((e) => e.closed)
  const g = closed.reduce((a, e) => a + e.guest_count, 0)
  const c = closed.reduce((a, e) => a + e.checked_in_count, 0)
  const rate = g ? (c / g) * 100 : 0

  return (
    <>
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-copy reveal">
          <div className="eyebrow"><i className="pulse" /> {live.length} event{live.length === 1 ? '' : 's'} live on NEAR right now</div>
          <h1>RSVPs that <span className="grad">actually show up.</span></h1>
          <p className="lede">Guests stake a little NEAR to save their spot. Pull up and you get it back — plus a cut of every no-show’s deposit. A contract holds the pot, so nobody has to be trusted.</p>
          <div className="row">
            <Link to="/explore" className="btn btn-lg">Find an event</Link>
            <Link to="/create" className="btn btn-lg btn-ghost">Host one in 60s →</Link>
          </div>
          <div className="hero-proof">
            {(act || []).slice(0, 4).map((a, i) => <Avatar key={i} id={a.account} size={30} />)}
            <span>{act?.[0] ? <><b>{act[0].account.split('.')[0]}</b> {KIND_LABEL[act[0].kind]} {timeAgo(act[0].ts_ms, now)}</> : 'Loading live activity…'}</span>
          </div>
        </div>
        <div className="hero-art reveal">
          <div className="orbit"><span>◎ 0.1 NEAR</span><span>✓ checked in</span><span>↑ +0.05 NEAR</span></div>
          <Mascot size={300} mood="wave" />
          <div className="hero-ticket">
            <div className="mono small">TICKET · #{events?.[3]?.id ?? 4}</div>
            <b>{live[0]?.title || 'Hackathon Demo Watch Party'}</b>
            <div className="ticket-qr" />
          </div>
        </div>
      </section>

      <section className="stats reveal">
        <div className="stat"><span className="stat-n">{stats ? <Count value={stats.events} /> : <i className="line shimmer" />}</span><span>events on-chain</span></div>
        <div className="stat"><span className="stat-n">{stats ? <Count value={nearNum(stats.total_staked)} dp={2} suffix=" NEAR" /> : <i className="line shimmer" />}</span><span>NEAR staked</span></div>
        <div className="stat"><span className="stat-n">{events ? <Count value={rate} suffix="%" /> : <i className="line shimmer" />}</span><span>show-up rate</span></div>
        <div className="stat"><span className="stat-n">{stats ? <Count value={nearNum(stats.total_paid_out)} dp={2} suffix=" NEAR" /> : <i className="line shimmer" />}</span><span>paid out to attendees</span></div>
      </section>

      <section className="section">
        <div className="sec-head reveal">
          <div><div className="eyebrow">Happening now & next</div><h2>Pull up to something</h2></div>
          <Link to="/explore" className="link-arrow">All events →</Link>
        </div>
        <div className="grid3">{events ? featured.map((e) => <EventCard key={e.id} ev={e} />) : <CardSkeleton />}</div>
      </section>

      <section className="section how" id="how">
        <div className="sec-head reveal"><div><div className="eyebrow">How it works</div><h2>Flaking finally costs something.</h2></div></div>
        <div className="flow reveal">
          {STEPS.map((s, i) => (
            <div className="flow-step" key={s.n} style={{ animationDelay: `${i * 0.9}s` }}>
              <div className="flow-ico">{s.ico}</div>
              <div className="mono small">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
          <div className="flow-line"><i /></div>
        </div>
        <div className="math reveal">
          <div className="math-row"><span className="dot ok" />Ada<span className="mono">0.1 → 0.15 NEAR</span></div>
          <div className="math-row"><span className="dot ok" />Ben<span className="mono">0.1 → 0.15 NEAR</span></div>
          <div className="math-row flake"><span className="dot" />Cy (no-show)<span className="mono">0.1 → 0 NEAR</span></div>
          <p className="muted small">3 RSVPs × 0.1 NEAR. Two pull up, one flakes. The 0.1 NEAR splits between the two who came.</p>
        </div>
      </section>

      <section className="section split reveal">
        <div className="split-card">
          <Mascot size={120} mood="cheer" />
          <div>
            <h3>{closed.length} events settled, fully on-chain</h3>
            <p className="muted">Every check-in, close and payout is a public NEAR transaction. Browse the results.</p>
            <Link to="/past" className="link-arrow">See past events →</Link>
          </div>
        </div>
        <div className="split-card alt">
          <div className="big-emoji">✦</div>
          <div>
            <h3>Need an idea for your next event?</h3>
            <p className="muted">Templates for run clubs, study groups, watch parties and more — with deposits that work.</p>
            <Link to="/ideas" className="link-arrow">Browse ideas →</Link>
          </div>
        </div>
      </section>

      <section className="cta reveal">
        <h2>Your next event deserves a full room.</h2>
        <p className="lede">Free to host on NEAR testnet. Takes about a minute.</p>
        <Link to="/create" className="btn btn-lg">Host an event</Link>
        <div className="mono small muted">{fmtNear(stats?.total_staked || '0')} staked so far</div>
      </section>
    </>
  )
}
