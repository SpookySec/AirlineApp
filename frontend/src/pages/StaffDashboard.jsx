import React, { useEffect, useState } from 'react'
import api, { fetchMe } from '../api'

export default function StaffDashboard(){
  const [me, setMe] = useState(null)
  const [flights, setFlights] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [rosterStatus, setRosterStatus] = useState(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      const user = await fetchMe()
      if(mounted) setMe(user)
      try{
        const resp = await api.get('flights/?page_size=50')
        if(mounted) setFlights(resp.data.results || resp.data)
      }catch(err){
        if(mounted) setMessage('Unable to load flights (staff rights required).')
      }finally{
        if(mounted) setLoading(false)
      }
    }
    load()
    return ()=>{ mounted = false }
  }, [])

  async function generateRoster(flightId){
    setRosterStatus('Generating roster...')
    try{
      const res = await api.post('rosters/generate/', { flight_id: flightId })
      setRosterStatus(`Roster generated for ${res.data.flight.flight_number}`)
    }catch(err){
      const msg = err.response?.data || err.message
      setRosterStatus(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
  }

  return (
    <div className="container">
      <div className="hero">
        <h2>Staff Console</h2>
        <div className="topbar-actions">
          {me ? (
            <span className="badge">{me.username} {me.is_staff ? '• staff' : ''}</span>
          ) : (
            <span className="muted">Login to access staff tools</span>
          )}
        </div>
      </div>

      {message && <div className="error-box">{message}</div>}
      {rosterStatus && <div className="info-box">{rosterStatus}</div>}

      {loading ? <p>Loading…</p> : (
        <div className="grid">
          {flights.map(f => (
            <div key={f.id} className="card">
              <div className="card-title">{f.flight_number} <span className="muted">{f.origin_airport?.code} → {f.destination_airport?.code}</span></div>
              <div className="muted">Departure: {new Date(f.departure_time).toLocaleString()}</div>
              <div className="muted">Plane: {f.plane_type?.name} ({f.plane_type?.code})</div>
              <div className="actions" style={{marginTop:10, gap:8}}>
                <button className="btn" onClick={()=>generateRoster(f.id)}>Generate roster</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
