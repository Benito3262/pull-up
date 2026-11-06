import { Link } from 'react-router-dom'
import { CONTRACT_ID, NETWORK_ID } from '../lib/config'

export function Home() {
  return (
    <div>
      <h1>Pull Up</h1>
      <p className="lede">
        Put a deposit down for the hang. Show up, get it back — plus a share of
        whoever ghosted. No apps. Just NEAR.
      </p>

      <div className="card">
        <h2>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
          <li>Host creates an event with a deposit and a check-in cutoff.</li>
          <li>Guests deposit NEAR and get a QR ticket.</li>
          <li>At the door, the host scans tickets.</li>
          <li>After close, attendees claim deposit + equal share of no-shows.</li>
        </ol>
        <hr className="hr" />
        <div className="row">
          <Link className="btn" to="/create">
            Create an event
          </Link>
          <a
            className="btn secondary"
            href={`https://${NETWORK_ID === 'testnet' ? 'testnet.' : ''}nearblocks.io/address/${CONTRACT_ID}`}
            target="_blank"
            rel="noreferrer"
          >
            Contract
          </a>
        </div>
      </div>

      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 24 }}>
        Built for NEAR HACKATHON · testnet · contract{' '}
        <span className="mono">{CONTRACT_ID}</span>
      </p>
    </div>
  )
}
