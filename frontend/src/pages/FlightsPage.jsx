import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function FlightsPage(){
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    api.get('flights/?page_size=50').then(r=>{ setFlights(r.data.results || r.data); setLoading(false) }).catch(()=>setLoading(false))
  }, [])

  return (
    <div className="container">
      <div className="hero">
        <h2>Available Flights</h2>
        <div className="topbar-actions">{(localStorage.getItem('access_token') || localStorage.getItem('username')) && <a className="btn ghost" href="/tickets">My tickets</a>}</div>
      </div>

      {loading ? <p>Loading…</p> : (
        <div className="grid">
          {flights.map(f => (
            <div key={f.id} className="card">
              <div className="card-title">{f.flight_number} <span className="muted">— {f.status}</span></div>
              <div className="flight-route">{f.origin} → {f.destination}</div>
              <div className="flight-time">{new Date(f.departure_time).toLocaleString()} — {new Date(f.arrival_time).toLocaleString()}</div>
              <div className="actions">
                <Link className="btn" to={`/flights/${f.id}`}>Details & Book</Link>
                <span className="badge">{f.aircraft?.model || 'Aircraft'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
