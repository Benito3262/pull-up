import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { WalletButton } from './components/WalletButton'
import { Home } from './pages/Home'
import { Create } from './pages/Create'
import { EventPage } from './pages/EventPage'
import { Scan } from './pages/Scan'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <Link to="/" className="brand">
            Pull <span>Up</span>
          </Link>
          <WalletButton />
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/e/:id" element={<EventPage />} />
          <Route path="/e/:id/scan" element={<Scan />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
