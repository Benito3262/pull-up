import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/UI'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { Past } from './pages/Past'
import { Create } from './pages/Create'
import { EventPage } from './pages/EventPage'
import { Scan } from './pages/Scan'
import { Tickets } from './pages/Tickets'
import { Host } from './pages/Host'
import { Ideas } from './pages/Ideas'
import { Leaderboard } from './pages/Leaderboard'
import { How } from './pages/How'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/past" element={<Past />} />
            <Route path="/create" element={<Create />} />
            <Route path="/e/:id" element={<EventPage />} />
            <Route path="/e/:id/scan" element={<Scan />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/host" element={<Host />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/suggestions" element={<Ideas />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/how" element={<How />} />
            <Route path="/faq" element={<How />} />
            <Route path="*" element={<How />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
