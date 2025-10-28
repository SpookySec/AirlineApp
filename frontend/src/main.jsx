import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import FlightsPage from './pages/FlightsPage'
import FlightDetail from './pages/FlightDetail'
import TicketsPage from './pages/TicketsPage'
import './styles.css'

import Auth from './ui/Auth'

function App(){
  const isLoggedIn = !!(localStorage.getItem('access_token') || localStorage.getItem('username'))

  return (
    <BrowserRouter>
      <nav className="topnav">
        <div style={{display:'flex',gap:12}}>
          <Link to="/">Flights</Link>
          {isLoggedIn && <Link to="/tickets">Tickets</Link>}
        </div>
        <Auth />
      </nav>
      <Routes>
        <Route path="/" element={<FlightsPage/>} />
  <Route path="/flights/:id" element={<FlightDetail/>} />
  <Route path="/tickets" element={<TicketsPage/>} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
