import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo, Mascot } from './Brand'
import { WalletButton } from './WalletButton'
import { Ticker, useReveal } from './UI'
import { CONTRACT_ID, ACCOUNT_EXPLORER } from '../lib/config'

const NAV = [
  ['/explore', 'Explore'],
  ['/past', 'Past events'],
  ['/ideas', 'Ideas'],
  ['/leaderboard', 'Leaderboard'],
  ['/how', 'How it works'],
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('pu-theme') || 'dark')
  const loc = useLocation()
  useReveal()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pu-theme', theme)
  }, [theme])
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <div className="shell">
      <Ticker />
      <header className="nav">
        <div className="nav-in">
          <Link to="/" aria-label="Pull Up home"><Logo /></Link>
          <nav className={`nav-links ${open ? 'open' : ''}`}>
            {NAV.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            <NavLink to="/tickets" className="only-m">My tickets</NavLink>
            <NavLink to="/host" className="only-m">Host dashboard</NavLink>
          </nav>
          <div className="nav-cta">
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <NavLink to="/tickets" className="nav-ghost hide-m">Tickets</NavLink>
            <Link to="/create" className="btn btn-sm hide-m">Host an event</Link>
            <WalletButton />
            <button className="icon-btn burger" onClick={() => setOpen(!open)} aria-label="Menu">{open ? '✕' : '☰'}</button>
          </div>
        </div>
      </header>
      <main className="main" key={loc.pathname}>
        <Outlet />
      </main>
      <footer className="foot">
        <div className="foot-in">
          <div className="foot-brand">
            <Logo />
            <p>Show up, get paid. No-shows fund the people who came. Built for NEAR HACKATHON.</p>
            <a className="mono small" href={`${ACCOUNT_EXPLORER}/${CONTRACT_ID}`} target="_blank" rel="noreferrer">contract: {CONTRACT_ID} ↗</a>
          </div>
          <div className="foot-cols">
            <div><h4>Attend</h4><Link to="/explore">Explore</Link><Link to="/tickets">My tickets</Link><Link to="/leaderboard">Leaderboard</Link></div>
            <div><h4>Host</h4><Link to="/create">Create event</Link><Link to="/host">Dashboard</Link><Link to="/ideas">Event ideas</Link></div>
            <div><h4>Learn</h4><Link to="/how">How it works</Link><Link to="/past">Past events</Link><a href="https://github.com/Benito3262/pull-up" target="_blank" rel="noreferrer">GitHub ↗</a></div>
          </div>
          <Mascot size={90} mood="sleep" className="foot-pip" />
        </div>
        <div className="foot-base">© 2026 Pull Up · NEAR testnet · deposits are testnet NEAR</div>
      </footer>
    </div>
  )
}
