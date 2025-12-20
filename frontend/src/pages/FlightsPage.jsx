import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'

export default function FlightsPage(){
  const [searchParams] = useSearchParams()
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(() => searchParams.get('search') || '')

  useEffect(()=>{
    api.get('flights/?page_size=100')
      .then(r=>{ setFlights(r.data.results || r.data); setLoading(false) })
      .catch(()=>setLoading(false))
  }, [])

  useEffect(()=>{
    const q = searchParams.get('search') || ''
    setQuery(q)
  }, [searchParams])

  const filtered = useMemo(()=>{
    if(!query.trim()) return flights
    const q = query.trim().toLowerCase()
    return flights.filter(f=>
      (f.flight_number || '').toLowerCase().includes(q) ||
      (f.origin_airport?.code || '').toLowerCase().includes(q) ||
      (f.destination_airport?.code || '').toLowerCase().includes(q)
    )
  }, [flights, query])

  return (
    <div style={{
      background: 'var(--bg)',
      backgroundImage: 'none',
      minHeight: '100vh',
      padding: '0',
      margin: '0'
    }}>
      <div className="container" style={{
        maxWidth: '100%',
        margin: '0',
        padding: '20px 24px'
      }}>
        <div style={{marginBottom: '24px'}}>
          <input className="input" placeholder="Search flight, origin, destination" value={query} onChange={e=>setQuery(e.target.value)} style={{width: '100%', maxWidth: '500px'}} />
        </div>

        {loading ? <p>Loading…</p> : (
          <div className="grid" style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filtered.map(f => (
              <div key={f.id} className="card">
                <div className="card-title">{f.flight_number} <span className="muted">— {f.status}</span></div>
                <div className="flight-route">{f.origin_airport?.code} → {f.destination_airport?.code}</div>
                <div className="flight-time">{new Date(f.departure_time).toLocaleString()} — {new Date(f.arrival_time).toLocaleString()}</div>
                <div className="muted">Plane: {f.plane_type?.name} ({f.plane_type?.code})</div>
                <div className="actions" style={{marginTop:10}}>
                  <Link className="btn" to={`/book?flight=${f.id}`}>Book</Link>
                  <span className="badge">{f.plane_type?.total_seats || '?'} seats</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
