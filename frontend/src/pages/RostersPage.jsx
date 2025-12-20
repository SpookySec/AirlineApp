import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import './RostersPage.css'

function SeatMap({ roster, onPassengerClick }) {
  if (!roster) return null
  const passengers = roster.passenger_assignments || []
  
  // Group by seat type and sort by row/seat number
  const seatsByType = passengers.reduce((acc, p) => {
    const k = p.seat_type || 'economy'
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})
  
  // Sort seats within each type by row number (extract number from seat_number like "5A" -> 5)
  Object.keys(seatsByType).forEach(type => {
    seatsByType[type].sort((a, b) => {
      const aNum = parseInt(a.seat_number?.match(/\d+/)?.[0] || '0')
      const bNum = parseInt(b.seat_number?.match(/\d+/)?.[0] || '0')
      if (aNum !== bNum) return aNum - bNum
      return (a.seat_number || '').localeCompare(b.seat_number || '')
    })
  })

  return (
    <div className="seatmap">
      {Object.entries(seatsByType).map(([seatType, pax]) => (
        <div key={seatType} className="seat-section">
          <div className="section-title">{seatType.toUpperCase()}</div>
          <div className="seat-grid">
            {pax.map(p => (
              <div 
                key={`${p.passenger}-${p.seat_number}`} 
                className={`seat-chip ${seatType}`}
                onClick={() => onPassengerClick && onPassengerClick(p)}
              >
                <div className="seat-label">{p.seat_number || 'INF'}</div>
                <div className="seat-name">{p.passenger?.first_name || ''} {p.passenger?.last_name || ''}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PassengerModal({ passenger, assignment, onClose }) {
  if (!passenger) return null
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Passenger Details</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="passenger-info-grid">
            <div className="info-section">
              <div className="info-label">Full Name</div>
              <div className="info-value">{passenger.first_name} {passenger.last_name}</div>
            </div>
            
            <div className="info-section">
              <div className="info-label">Seat Assignment</div>
              <div className="info-value">
                <span className="seat-badge">{assignment?.seat_number || 'Not assigned'}</span>
                <span className="seat-type-badge">{assignment?.seat_type || passenger.seat_type || 'economy'}</span>
              </div>
            </div>
            
            <div className="info-section">
              <div className="info-label">Contact Information</div>
              <div className="info-value">
                <div>📧 {passenger.email || 'N/A'}</div>
                <div>📞 {passenger.phone || 'N/A'}</div>
              </div>
            </div>
            
            <div className="info-section">
              <div className="info-label">Travel Documents</div>
              <div className="info-value">
                <div>🛂 Passport: {passenger.passport_number || 'N/A'}</div>
                <div>🌍 Nationality: {passenger.nationality || 'N/A'}</div>
              </div>
            </div>
            
            <div className="info-section">
              <div className="info-label">Personal Information</div>
              <div className="info-value">
                <div>Age: {passenger.age || 'N/A'}</div>
                {passenger.gender && <div>Gender: {passenger.gender}</div>}
                <div>Date of Birth: {formatDate(passenger.date_of_birth)}</div>
                {passenger.is_infant && <div className="infant-badge">👶 Infant Passenger</div>}
              </div>
            </div>
            
            {passenger.parent && (
              <div className="info-section">
                <div className="info-label">Parent/Guardian</div>
                <div className="info-value">
                  {passenger.parent.first_name} {passenger.parent.last_name}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RostersPage(){
  const [rosters, setRosters] = useState([])
  const [flights, setFlights] = useState([])
  const [selectedFlight, setSelectedFlight] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedPassenger, setSelectedPassenger] = useState(null)

  useEffect(()=>{
    setLoading(true)
    Promise.all([
      api.get('rosters/?page_size=50'),
      api.get('flights/?page_size=50'),
    ]).then(([rRes, fRes])=>{
      setRosters(rRes.data.results || rRes.data)
      setFlights(fRes.data.results || fRes.data)
    }).catch(()=>{})
    .finally(()=>setLoading(false))
  }, [])

  const selectedRoster = useMemo(()=> rosters.find(r => `${r.flight?.id}` === `${selectedFlight}`) || rosters[0], [rosters, selectedFlight])

  async function generate(){
    if(!selectedFlight) return setError('Choose a flight to generate a roster.')
    setError(null)
    setCreating(true)
    try{
      const res = await api.post('rosters/generate/', { flight_id: selectedFlight })
      setRosters(prev => [res.data, ...prev])
    }catch(err){
      const msg = err.response?.data || err.message
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }finally{
      setCreating(false)
    }
  }

  return (
    <div className="container">
      <div className="hero">
        <h2>Rosters</h2>
        <div className="topbar-actions" style={{gap:8}}>
          <select value={selectedFlight} onChange={e=>setSelectedFlight(e.target.value)} className="input">
            <option value="">Select flight</option>
            {flights.map(f => (
              <option key={f.id} value={f.id}>{f.flight_number} ({f.origin_airport?.code}→{f.destination_airport?.code})</option>
            ))}
          </select>
          <button className="btn" onClick={generate} disabled={creating}>{creating ? 'Generating…' : 'Generate Roster'}</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? <p>Loading…</p> : (
        <div className="roster-layout">
          <aside className="card" style={{maxWidth:320}}>
            <h4>Recent rosters</h4>
            <ul className="list">
              {rosters.map(r => (
                <li key={r.id} className={`list-item ${selectedRoster && r.id === selectedRoster.id ? 'active' : ''}`} onClick={()=>setSelectedFlight(r.flight?.id)}>
                  <div className="title">{r.flight?.flight_number}</div>
                  <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
                  <div className="muted">backend: {r.backend}</div>
                </li>
              ))}
            </ul>
          </aside>

          <main className="card" style={{flex:1}}>
            {!selectedRoster && <div className="muted">Select a roster to view.</div>}
            {selectedRoster && (
              <div className="roster-detail">
                <div className="roster-head">
                  <div>
                    <h3>{selectedRoster.flight?.flight_number}</h3>
                    <div className="muted">{selectedRoster.flight?.origin_airport?.code} → {selectedRoster.flight?.destination_airport?.code}</div>
                  </div>
                  <div className="muted">Created {new Date(selectedRoster.created_at).toLocaleString()}</div>
                </div>

                <div className="cards-row">
                  <div className="mini-card">
                    <div className="mini-title">Pilots</div>
                    <ul className="mini-list">
                      {selectedRoster.crew_assignments.filter(c=>c.crew_type === 'pilot').map(c => (
                        <li key={c.id}>{c.pilot?.code} — {c.pilot?.first_name} {c.pilot?.last_name} <span className="muted">({c.assigned_role})</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="mini-card">
                    <div className="mini-title">Cabin Crew</div>
                    <ul className="mini-list">
                      {selectedRoster.crew_assignments.filter(c=>c.crew_type === 'cabin').map(c => (
                        <li key={c.id}>{c.cabin_crew?.code} — {c.cabin_crew?.first_name} {c.cabin_crew?.last_name} <span className="muted">({c.assigned_role})</span></li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="section">
                  <h4>Passengers & seats</h4>
                  <SeatMap 
                    roster={selectedRoster} 
                    onPassengerClick={(assignment) => setSelectedPassenger(assignment)}
                  />
                </div>
                
                {selectedPassenger && (
                  <PassengerModal
                    passenger={selectedPassenger.passenger}
                    assignment={selectedPassenger}
                    onClose={() => setSelectedPassenger(null)}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
