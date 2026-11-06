import { Link } from 'react-router-dom'
import { Mascot } from '../components/Brand'
import { PageHead } from '../components/UI'
import { ACCOUNT_EXPLORER, CONTRACT_ID } from '../lib/config'

const FAQ: [string, string][] = [
  ['What happens to my deposit if I show up?', 'You get it back, plus an equal share of every no-show’s deposit, once the event closes. You claim it yourself from the event page.'],
  ['What if nobody shows up?', 'The contract switches to refund mode, and every depositor can claim their exact deposit back.'],
  ['Can the host run off with the money?', 'No. Deposits sit in the contract. The host can only check guests in and close the event. The only thing a host ever receives is rounding dust of a few yoctoNEAR.'],
  ['How does check-in work?', 'When you RSVP, your device creates a secret ticket and the contract stores only its hash. At the door the host scans your QR, and the contract checks it against the hash before marking you as there.'],
  ['Who can close an event?', 'The host can close at any time. After the check-in deadline, anyone can close it, so funds never get stuck.'],
  ['Why not just use a bank or payment app?', 'A bank needs someone to hold the money and do the refunds by hand. Pull Up works across borders, settles in seconds for a fraction of a cent, and anyone can check the payouts on the explorer.'],
  ['Is this real money?', 'This build runs on NEAR testnet, so deposits are free test NEAR. You can get some from the testnet faucet.'],
]

export function How() {
  return (
    <div className="page">
      <PageHead eyebrow="How it works" title="A tiny stake. A full room." sub="Pull Up turns an RSVP into a small commitment that pays you back for showing up." />
      <div className="how-grid">
        {[
          ['Guest', 'Stake to RSVP, get a QR ticket, show up, claim deposit + bonus.', 'wave'],
          ['Host', 'Create an event, scan guests at the door, close to settle. Never holds funds.', 'cheer'],
          ['Contract', 'Holds every deposit, verifies tickets, splits the no-show pot evenly.', 'run'],
        ].map(([t, d, m]) => (
          <div className="card how-card reveal" key={t}>
            <Mascot size={90} mood={m as 'wave'} />
            <h3>{t}</h3>
            <p className="muted">{d}</p>
          </div>
        ))}
      </div>
      <div className="card formula reveal">
        <div className="mono">payout = deposit + ⌊(no_shows × deposit) ÷ attendees⌋</div>
        <p className="muted small">Rounding remainder goes to the host on close. Every call is public on the <a href={`${ACCOUNT_EXPLORER}/${CONTRACT_ID}`} target="_blank" rel="noreferrer">explorer ↗</a>.</p>
      </div>
      <section className="section">
        <h2 className="reveal">FAQ</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details className="reveal" key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>
      <div className="cta reveal"><h2>Ready?</h2><div className="row"><Link to="/explore" className="btn btn-lg">Explore events</Link><Link to="/create" className="btn btn-lg btn-ghost">Host one</Link></div></div>
    </div>
  )
}
