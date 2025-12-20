import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import './RostersPage.css'

// View types
const VIEW_TABULAR = 'tabular'
const VIEW_PLANE = 'plane'
const VIEW_EXTENDED = 'extended'

function TabularView({ roster }) {
  if (!roster) return null
  
  const allPeople = useMemo(() => {
    const people = []
    
    // Add pilots
    roster.crew_assignments?.filter(c => c.crew_type === 'pilot').forEach(c => {
      people.push({
        type: 'Flight Crew',
        name: `${c.pilot?.first_name || ''} ${c.pilot?.last_name || ''}`.trim(),
        id: c.pilot?.code || c.pilot?.id || 'N/A',
        role: c.assigned_role || 'Pilot',
        details: c
      })
    })
    
    // Add cabin crew
    roster.crew_assignments?.filter(c => c.crew_type === 'cabin').forEach(c => {
      people.push({
        type: 'Cabin Crew',
        name: `${c.cabin_crew?.first_name || ''} ${c.cabin_crew?.last_name || ''}`.trim(),
        id: c.cabin_crew?.code || c.cabin_crew?.id || 'N/A',
        role: c.assigned_role || 'Cabin Crew',
        details: c
      })
    })
    
    // Add passengers
    roster.passenger_assignments?.forEach(p => {
      people.push({
        type: 'Passenger',
        name: `${p.passenger?.first_name || ''} ${p.passenger?.last_name || ''}`.trim(),
        id: p.passenger?.id || p.passenger?.passport_number || 'N/A',
        role: p.seat_number || 'No seat',
        details: p
      })
    })
    
    return people
  }, [roster])
  
  return (
    <div className="tabular-view">
      <table className="people-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>ID/Code</th>
            <th>Role/Seat</th>
          </tr>
        </thead>
        <tbody>
          {allPeople.map((person, idx) => (
            <tr key={`${person.type}-${person.id}-${idx}`}>
              <td><span className={`type-badge type-${person.type.toLowerCase().replace(' ', '-')}`}>{person.type}</span></td>
              <td>{person.name || 'N/A'}</td>
              <td className="muted">{person.id}</td>
              <td>{person.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlaneView({ roster, onPersonHover, onPassengerClick }) {
  if (!roster || !roster.flight?.plane_type) return <div className="muted">No plane information available</div>
  
  const planeType = roster.flight.plane_type
  const seatLayout = planeType.seat_layout || {}
  
  // Build seat map with all people
  const seatMap = useMemo(() => {
    const map = {}
    
    // Add crew seats (assign them to crew positions)
    roster.crew_assignments?.forEach((c, idx) => {
      const seat = c.crew_type === 'pilot' ? `P${idx + 1}` : `CC${idx + 1}`
      map[seat] = {
        type: c.crew_type === 'pilot' ? 'pilot' : 'cabin',
        name: c.crew_type === 'pilot' 
          ? `${c.pilot?.first_name || ''} ${c.pilot?.last_name || ''}`.trim()
          : `${c.cabin_crew?.first_name || ''} ${c.cabin_crew?.last_name || ''}`.trim(),
        id: c.crew_type === 'pilot' ? c.pilot?.code : c.cabin_crew?.code,
        role: c.assigned_role,
        assignment: c
      }
    })
    
    // Add passenger seats
    roster.passenger_assignments?.forEach(p => {
      if (p.seat_number) {
        map[p.seat_number] = {
          type: 'passenger',
          name: `${p.passenger?.first_name || ''} ${p.passenger?.last_name || ''}`.trim(),
          id: p.passenger?.passport_number || p.passenger?.id,
          seatType: p.seat_type,
          assignment: p
        }
      }
    })
    
    return map
  }, [roster])
  
  const businessSeats = seatLayout.business || []
  const economySeats = seatLayout.economy || []
  
  return (
    <div className="plane-view">
      <div className="plane-header">
        <h4>{planeType.name} ({planeType.code})</h4>
        <div className="muted">Total Seats: {planeType.total_seats || 'N/A'}</div>
      </div>
      
      <div className="seat-plan">
        {businessSeats.length > 0 && (
          <div className="seat-section-plane">
            <div className="section-label">Business Class</div>
            <div className="seat-rows">
              {Array.from(new Set(businessSeats.map(s => parseInt(s.match(/\d+/)?.[0] || '0')))).map(rowNum => {
                const rowSeats = businessSeats.filter(s => parseInt(s.match(/\d+/)?.[0] || '0') === rowNum)
                return (
                  <div key={`b-${rowNum}`} className="seat-row">
                    <div className="row-number">{rowNum}</div>
                    <div className="seats-in-row">
                      {rowSeats.map(seat => {
                        const occupant = seatMap[seat]
                        return (
                          <div
                            key={seat}
                            className={`plane-seat ${occupant ? `occupied ${occupant.type}` : 'empty'}`}
                            onMouseEnter={() => occupant && onPersonHover && onPersonHover(occupant)}
                            onMouseLeave={() => onPersonHover && onPersonHover(null)}
                            onClick={() => {
                              if (occupant && occupant.type === 'passenger' && onPassengerClick) {
                                onPassengerClick(occupant.assignment)
                              }
                            }}
                            style={{ cursor: occupant && occupant.type === 'passenger' ? 'pointer' : 'default' }}
                            title={occupant ? `${occupant.name} (${occupant.id})${occupant.type === 'passenger' ? ' - Click for details' : ''}` : 'Empty'}
                          >
                            {occupant ? occupant.name.split(' ').map(n => n[0]).join('') : seat.slice(-1)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        <div className="plane-divider"></div>
        
        {economySeats.length > 0 && (
          <div className="seat-section-plane">
            <div className="section-label">Economy Class</div>
            <div className="seat-rows">
              {Array.from(new Set(economySeats.map(s => parseInt(s.match(/\d+/)?.[0] || '0')))).slice(0, 20).map(rowNum => {
                const rowSeats = economySeats.filter(s => parseInt(s.match(/\d+/)?.[0] || '0') === rowNum)
                return (
                  <div key={`e-${rowNum}`} className="seat-row">
                    <div className="row-number">{rowNum}</div>
                    <div className="seats-in-row">
                      {rowSeats.map(seat => {
                        const occupant = seatMap[seat]
                        return (
                          <div
                            key={seat}
                            className={`plane-seat ${occupant ? `occupied ${occupant.type}` : 'empty'}`}
                            onMouseEnter={() => occupant && onPersonHover && onPersonHover(occupant)}
                            onMouseLeave={() => onPersonHover && onPersonHover(null)}
                            onClick={() => {
                              if (occupant && occupant.type === 'passenger' && onPassengerClick) {
                                onPassengerClick(occupant.assignment)
                              }
                            }}
                            style={{ cursor: occupant && occupant.type === 'passenger' ? 'pointer' : 'default' }}
                            title={occupant ? `${occupant.name} (${occupant.id})${occupant.type === 'passenger' ? ' - Click for details' : ''}` : 'Empty'}
                          >
                            {occupant ? occupant.name.split(' ').map(n => n[0]).join('') : seat.slice(-1)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {seatMap['P1'] && (
        <div className="crew-positions">
          <div className="crew-section">
            <strong>Flight Crew Positions:</strong>
            {Object.keys(seatMap).filter(k => k.startsWith('P')).map(k => (
              <span key={k} className="crew-badge">{k}: {seatMap[k].name}</span>
            ))}
          </div>
          <div className="crew-section">
            <strong>Cabin Crew Positions:</strong>
            {Object.keys(seatMap).filter(k => k.startsWith('CC')).map(k => (
              <span key={k} className="crew-badge">{k}: {seatMap[k].name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExtendedView({ roster }) {
  if (!roster) return null
  
  const pilots = roster.crew_assignments?.filter(c => c.crew_type === 'pilot') || []
  const cabinCrew = roster.crew_assignments?.filter(c => c.crew_type === 'cabin') || []
  const passengers = roster.passenger_assignments || []
  
  return (
    <div className="extended-view">
      <div className="extended-section">
        <h4>Flight Crew</h4>
        <table className="extended-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Seniority</th>
              <th>Nationality</th>
              <th>Languages</th>
              <th>Max Range</th>
            </tr>
          </thead>
          <tbody>
            {pilots.map(c => (
              <tr key={c.id}>
                <td>{c.pilot?.code || 'N/A'}</td>
                <td>{c.pilot?.first_name || ''} {c.pilot?.last_name || ''}</td>
                <td>{c.pilot?.seniority || c.assigned_role || 'N/A'}</td>
                <td>{c.pilot?.nationality || 'N/A'}</td>
                <td>{(c.pilot?.known_languages || []).join(', ') || 'N/A'}</td>
                <td>{c.pilot?.max_range_km ? `${c.pilot.max_range_km} km` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="extended-section">
        <h4>Cabin Crew</h4>
        <table className="extended-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Role</th>
              <th>Seniority</th>
              <th>Nationality</th>
              <th>Languages</th>
            </tr>
          </thead>
          <tbody>
            {cabinCrew.map(c => (
              <tr key={c.id}>
                <td>{c.cabin_crew?.code || 'N/A'}</td>
                <td>{c.cabin_crew?.first_name || ''} {c.cabin_crew?.last_name || ''}</td>
                <td>{c.cabin_crew?.role || c.assigned_role || 'N/A'}</td>
                <td>{c.cabin_crew?.seniority || 'N/A'}</td>
                <td>{c.cabin_crew?.nationality || 'N/A'}</td>
                <td>{(c.cabin_crew?.known_languages || []).join(', ') || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="extended-section">
        <h4>Passengers</h4>
        <table className="extended-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Seat</th>
              <th>Class</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Passport</th>
              <th>Nationality</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            {passengers.map(p => (
              <tr key={p.id}>
                <td>{p.passenger?.first_name || ''} {p.passenger?.last_name || ''}</td>
                <td>{p.seat_number || 'N/A'}</td>
                <td>{p.seat_type || 'economy'}</td>
                <td>{p.passenger?.email || 'N/A'}</td>
                <td>{p.passenger?.phone || 'N/A'}</td>
                <td>{p.passenger?.passport_number || 'N/A'}</td>
                <td>{p.passenger?.nationality || 'N/A'}</td>
                <td>{p.passenger?.age || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HoverTooltip({ person }) {
  if (!person) return null
  
  return (
    <div className="hover-tooltip">
      <div className="tooltip-name">{person.name}</div>
      <div className="tooltip-id">ID: {person.id}</div>
      {person.role && <div className="tooltip-role">{person.role}</div>}
      {person.seatType && <div className="tooltip-seat">Class: {person.seatType}</div>}
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

export default function RostersPageEnhanced(){
  const [rosters, setRosters] = useState([])
  const [flights, setFlights] = useState([])
  const [selectedFlightId, setSelectedFlightId] = useState('')
  const [flightSearch, setFlightSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [selectedRosterId, setSelectedRosterId] = useState(null)
  const [viewMode, setViewMode] = useState(VIEW_TABULAR)
  const [databaseBackend, setDatabaseBackend] = useState('sql')
  const [hoveredPerson, setHoveredPerson] = useState(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('rosters/?page_size=100'),
      api.get('flights/?page_size=100'),
    ]).then(([rRes, fRes]) => {
      setRosters(rRes.data.results || rRes.data)
      setFlights(fRes.data.results || fRes.data)
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  const filteredFlights = useMemo(() => {
    if (!flightSearch.trim()) return flights
    const q = flightSearch.trim().toLowerCase()
    return flights.filter(f =>
      (f.flight_number || '').toLowerCase().includes(q) ||
      (f.origin_airport?.code || '').toLowerCase().includes(q) ||
      (f.destination_airport?.code || '').toLowerCase().includes(q) ||
      (f.origin_airport?.city || '').toLowerCase().includes(q) ||
      (f.destination_airport?.city || '').toLowerCase().includes(q)
    )
  }, [flights, flightSearch])

  const selectedRoster = useMemo(() => 
    rosters.find(r => r.id === selectedRosterId) || 
    (selectedFlightId ? rosters.find(r => `${r.flight?.id}` === `${selectedFlightId}`) : null) ||
    rosters[0],
    [rosters, selectedRosterId, selectedFlightId]
  )

  const selectedFlight = useMemo(() => 
    flights.find(f => `${f.id}` === `${selectedFlightId}`),
    [flights, selectedFlightId]
  )

  async function generateRoster() {
    if (!selectedFlightId) {
      setError('Please select a flight first.')
      return
    }
    setError(null)
    setCreating(true)
    try {
      const res = await api.post('rosters/generate/', { 
        flight_id: selectedFlightId,
        backend: databaseBackend
      })
      setRosters(prev => [res.data, ...prev])
      setSelectedRosterId(res.data.id)
      setShowGenerateModal(false)
    } catch (err) {
      const msg = err.response?.data || err.message
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setCreating(false)
    }
  }

  function exportToJSON() {
    if (!selectedRoster) {
      setError('No roster selected to export.')
      return
    }
    
    const exportData = {
      flight: {
        flight_number: selectedRoster.flight?.flight_number,
        origin: selectedRoster.flight?.origin_airport?.code,
        destination: selectedRoster.flight?.destination_airport?.code,
        departure: selectedRoster.flight?.departure_time,
        arrival: selectedRoster.flight?.arrival_time,
      },
      backend: selectedRoster.backend,
      created_at: selectedRoster.created_at,
      crew: selectedRoster.crew_assignments?.map(c => ({
        type: c.crew_type,
        code: c.crew_type === 'pilot' ? c.pilot?.code : c.cabin_crew?.code,
        name: c.crew_type === 'pilot' 
          ? `${c.pilot?.first_name} ${c.pilot?.last_name}`
          : `${c.cabin_crew?.first_name} ${c.cabin_crew?.last_name}`,
        role: c.assigned_role,
      })) || [],
      passengers: selectedRoster.passenger_assignments?.map(p => ({
        name: `${p.passenger?.first_name} ${p.passenger?.last_name}`,
        seat: p.seat_number,
        seat_type: p.seat_type,
        email: p.passenger?.email,
        passport: p.passenger?.passport_number,
      })) || [],
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roster-${selectedRoster.flight?.flight_number || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container">
      <div className="hero">
        <h2>Flight Roster Management</h2>
        <div className="topbar-actions" style={{gap: 12, flexWrap: 'wrap', display: 'flex', alignItems: 'center'}}>
          <input 
            className="input" 
            placeholder="Search by flight number, origin, destination..."
            value={flightSearch}
            onChange={e => setFlightSearch(e.target.value)}
            style={{minWidth: 250}}
          />
          <select 
            value={selectedFlightId} 
            onChange={e => setSelectedFlightId(e.target.value)} 
            className="input"
            style={{minWidth: 200}}
          >
            <option value="">Select flight...</option>
            {filteredFlights.map(f => (
              <option key={f.id} value={f.id}>
                {f.flight_number} ({f.origin_airport?.code}→{f.destination_airport?.code})
              </option>
            ))}
          </select>
          <button 
            className="btn" 
            onClick={() => setShowGenerateModal(true)}
            disabled={!selectedFlightId || creating}
          >
            Generate Roster
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: 400}}>
            <div className="modal-header">
              <h3>Generate Roster</h3>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <div className="info-label">Flight</div>
                <div className="info-value">
                  {selectedFlight?.flight_number} ({selectedFlight?.origin_airport?.code} → {selectedFlight?.destination_airport?.code})
                </div>
              </div>
              <div className="info-section">
                <div className="info-label">Database Backend</div>
                <div className="info-value">
                  <select 
                    value={databaseBackend} 
                    onChange={e => setDatabaseBackend(e.target.value)}
                    className="input"
                    style={{width: '100%'}}
                  >
                    <option value="sql">SQL Database</option>
                    <option value="nosql">NoSQL Database</option>
                  </select>
                </div>
              </div>
              <div className="actions" style={{marginTop: 16, justifyContent: 'flex-end'}}>
                <button className="btn ghost" onClick={() => setShowGenerateModal(false)}>Cancel</button>
                <button className="btn" onClick={generateRoster} disabled={creating}>
                  {creating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="roster-layout">
          <aside className="card" style={{maxWidth: 320}}>
            <h4>Saved Rosters</h4>
            <ul className="list">
              {rosters.length === 0 && <li className="muted">No rosters yet</li>}
              {rosters.map(r => (
                <li 
                  key={r.id} 
                  className={`list-item ${selectedRoster && r.id === selectedRoster.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRosterId(r.id)
                    setSelectedFlightId(r.flight?.id || '')
                  }}
                >
                  <div className="title">{r.flight?.flight_number || 'Unknown'}</div>
                  <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
                  <div className="muted">Backend: {r.backend.toUpperCase()}</div>
                </li>
              ))}
            </ul>
          </aside>

          <main className="card" style={{flex: 1}}>
            {!selectedRoster ? (
              <div className="muted">Select or generate a roster to view</div>
            ) : (
              <>
                {selectedRoster && (
                  <div style={{marginBottom: 16, display: 'flex', justifyContent: 'flex-end'}}>
                    <button className="btn secondary" onClick={exportToJSON}>
                      Export JSON
                    </button>
                  </div>
                )}
                <div className="roster-detail">
                <div className="roster-head">
                  <div>
                    <h3>{selectedRoster.flight?.flight_number}</h3>
                    <div className="muted">
                      {selectedRoster.flight?.origin_airport?.code} → {selectedRoster.flight?.destination_airport?.code}
                    </div>
                  </div>
                  <div className="muted">
                    Created {new Date(selectedRoster.created_at).toLocaleString()}
                    <br />
                    Backend: {selectedRoster.backend.toUpperCase()}
                  </div>
                </div>

                <div className="view-tabs">
                  <button 
                    className={`view-tab ${viewMode === VIEW_TABULAR ? 'active' : ''}`}
                    onClick={() => setViewMode(VIEW_TABULAR)}
                  >
                    Tabular View
                  </button>
                  <button 
                    className={`view-tab ${viewMode === VIEW_PLANE ? 'active' : ''}`}
                    onClick={() => setViewMode(VIEW_PLANE)}
                  >
                    Plane View
                  </button>
                  <button 
                    className={`view-tab ${viewMode === VIEW_EXTENDED ? 'active' : ''}`}
                    onClick={() => setViewMode(VIEW_EXTENDED)}
                  >
                    Extended View
                  </button>
                </div>

                <div className="view-content">
                  {viewMode === VIEW_TABULAR && <TabularView roster={selectedRoster} />}
                  {viewMode === VIEW_PLANE && (
                    <>
                      <PlaneView 
                        roster={selectedRoster} 
                        onPersonHover={setHoveredPerson}
                        onPassengerClick={setSelectedPassenger}
                      />
                      {hoveredPerson && (
                        <div style={{position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1001}}>
                          <HoverTooltip person={hoveredPerson} />
                        </div>
                      )}
                      {selectedPassenger && (
                        <PassengerModal
                          passenger={selectedPassenger.passenger}
                          assignment={selectedPassenger}
                          onClose={() => setSelectedPassenger(null)}
                        />
                      )}
                    </>
                  )}
                  {viewMode === VIEW_EXTENDED && <ExtendedView roster={selectedRoster} />}
                </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
