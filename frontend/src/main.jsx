import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom'

import FlightDetail from './pages/FlightDetail'
import TicketsPage from './pages/TicketsPage'
import './styles.css'

import Auth from './ui/Auth'
//import StaffPage from './pages/StaffPage'
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Book from './pages/Book.jsx'

function App(){
  const [authUser, setAuthUser] = useState(localStorage.getItem('username') || null)

  useEffect(() => {
    const onAuth = () => setAuthUser(localStorage.getItem('username') || null)
    window.addEventListener('auth', onAuth)
    window.addEventListener('storage', onAuth)
    return () => {
      window.removeEventListener('auth', onAuth)
      window.removeEventListener('storage', onAuth)
    }
  }, [])

  const isLoggedIn = !!authUser

  function handleLogout(){
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('username')
    window.dispatchEvent(new Event('auth'))
  }

  return (
    <BrowserRouter>
      <nav className="topnav">
        <div className="nav-center">
          <NavLink to="/" className={({isActive})=> isActive ? 'active nav-item' : 'nav-item'}>Home</NavLink>
          <NavLink to="/book" className={({isActive})=> isActive ? 'active nav-item' : 'nav-item'}>Book</NavLink>
          {isLoggedIn && <NavLink to="/tickets" className={({isActive})=> isActive ? 'active nav-item' : 'nav-item'}>Tickets</NavLink>}
          
        </div>

        <div className="nav-right">
          {!isLoggedIn ? (
            <>
              <Link to="/register" className="nav-link">Register</Link>
              <Link to="/login" className="btn">Login</Link>
            </>
          ) : (
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <span className="nav-username">{authUser}</span>
              <button className="btn ghost" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights/:id" element={<FlightDetail />} />
        <Route path="/tickets" element={<TicketsPage />} />
        
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/book" element={<Book />} />
        
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
