import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import './Book.css'

const CLASS_MULTIPLIERS = { Economy: 1.0, Business: 1.8, First: 3.2 }

function deterministicBasePrice(flight){
  // Create a deterministic base price from flight id or number so values feel stable
  const seed = flight.id || 0
  const base = 100 + (seed * 37) % 300 // 100..399
  return base
}

function currencyFormat(v){
  return `$${Number(v).toFixed(2)}`
}

// Simple Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error)
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div style={{padding: '20px', color: 'red'}}>Error loading seat map</div>
    }
    return this.props.children
  }
}

export default function Book(){
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(1) // 1: passenger info, 2: seat selection
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', passport_number:'', nationality:'', date_of_birth:'1990-01-01', seat_number:'', ticket_class:'Economy', promo_code:'' })
  const [promo, setPromo] = useState({ applied:false, discount:0 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [takenSeats, setTakenSeats] = useState(new Set())

  // Calculate base price and estimated price - define early so they're available for all hooks
  const basePrice = useMemo(()=> selected ? deterministicBasePrice(selected) : 0, [selected])
  const estimated = useMemo(()=>{
    if(!selected) return 0
    const mult = CLASS_MULTIPLIERS[form.ticket_class] || 1
    const raw = basePrice * mult
    const afterPromo = promo.applied ? raw * (1 - promo.discount) : raw
    return Number(afterPromo)
  }, [selected, form.ticket_class, basePrice, promo])

  // Build seat map from plane type seat layout
  const seatMapData = useMemo(() => {
    if (!selected || !selected.plane_type) return null
    
    const layout = selected.plane_type.seat_layout || {}
    const allSeats = []
    
    // Build seat list from layout
    if (layout.first) allSeats.push(...layout.first.map(s => ({ label: s, class: 'First' })))
    if (layout.business) allSeats.push(...layout.business.map(s => ({ label: s, class: 'Business' })))
    if (layout.economy) allSeats.push(...layout.economy.map(s => ({ label: s, class: 'Economy' })))
    
    // If no layout, create default seats
    if (allSeats.length === 0) {
      const capacity = selected.plane_type.total_seats || 120
      const seatsPerRow = 6
      const rows = Math.ceil(capacity / seatsPerRow)
      const letters = ['A','B','C','D','E','F']
      for(let r=1; r<=rows; r++){
        for(let c=0; c<seatsPerRow; c++){
          const idx = (r-1) * seatsPerRow + c
          if(idx >= capacity) break
          allSeats.push({ label: `${r}${letters[c]}`, class: 'Economy' })
        }
      }
    }

    // Parse seat labels to get row and column
    const parseSeat = (label) => {
      const match = label.match(/(\d+)([A-Z]+)/)
      if (!match) return { row: 0, col: 0, letter: '' }
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      return { 
        row: parseInt(match[1], 10), 
        col: letters.indexOf(match[2]),
        letter: match[2]
      }
    }

    // Group seats by row
    const seatsByRow = new Map()
    allSeats.forEach(seat => {
      const parsed = parseSeat(seat.label)
      if (!seatsByRow.has(parsed.row)) {
        seatsByRow.set(parsed.row, [])
      }
      seatsByRow.get(parsed.row).push({
        ...seat,
        ...parsed,
        taken: takenSeats.has(seat.label),
        selectable: !takenSeats.has(seat.label) && seat.class === form.ticket_class
      })
    })

    // Sort rows and seats within rows
    const rows = Array.from(seatsByRow.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([row, seats]) => ({
        row,
        seats: seats.sort((a, b) => a.col - b.col)
      }))

    return { rows, allSeats }
  }, [selected, takenSeats, form.ticket_class])

  useEffect(()=>{
    setLoading(true)
    api.get('flights/?page_size=50')
      .then(r=>{
        const flightsData = r.data.results || r.data
        setFlights(flightsData)
        
        // Auto-select flight from URL parameter
        const flightId = searchParams.get('flight')
        if (flightId) {
          const flight = flightsData.find(f => f.id === parseInt(flightId))
          if (flight) {
            setSelected(flight)
            setForm(prev => ({...prev, ticket_class: 'Economy'}))
            setStep(1)
            setError(null)
          }
        }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [searchParams])

  

  const filtered = useMemo(()=>{
    if(!query.trim()) return flights
    const q = query.trim().toLowerCase()
    return flights.filter(f=>
      (f.flight_number||'').toLowerCase().includes(q) ||
      (f.origin_airport?.code||'').toLowerCase().includes(q) ||
      (f.destination_airport?.code||'').toLowerCase().includes(q)
    )
  }, [flights, query])

  function update(field, value){ setForm(prev=> ({...prev, [field]: value})); setError(null) }

  // fetch taken seats for selected flight (best-effort; may require auth)
  useEffect(()=>{
    setTakenSeats(new Set())
    if(!selected) return
    api.get(`tickets/?flight=${selected.id}&page_size=500`).then(r=>{
      const rows = r.data.results || r.data || []
      const seats = new Set(rows.map(t=> (t.seat_number||'').toString().trim()).filter(Boolean))
      setTakenSeats(seats)
    }).catch(()=>{
      setTakenSeats(new Set())
    })
  }, [selected])

  

  function applyPromo(){
    // Fake promo codes: SAVE10 -> 10%, SAVE25 -> 25%
    const code = (form.promo_code || '').trim().toUpperCase()
    if(!code) return setError('Enter a promo code to apply')
    if(code === 'SAVE10') return setPromo({ applied:true, discount:0.10 })
    if(code === 'SAVE25') return setPromo({ applied:true, discount:0.25 })
    setError('Invalid promo code')
  }

  function validate(){
    if(!selected) return 'Choose a flight'
    if(!form.first_name.trim()) return 'First name required'
    if(!form.last_name.trim()) return 'Last name required'
    if(!form.email.trim()) return 'Email required'
    if(!form.phone.trim()) return 'Phone number required'
    if(!form.passport_number.trim()) return 'Passport number required'
    if(!form.nationality.trim()) return 'Nationality required'
    return null
  }

  function proceedToSeatSelection(){
    setError(null)
    const v = validate()
    if(v) return setError(v)
    setStep(2)
  }

  function backToPassengerInfo(){
    setStep(1)
    setError(null)
  }

  async function book(e){
    e.preventDefault()
    setError(null)
    const v = validate()
    if(v) return setError(v)
    setSubmitting(true)
    try{
      const p = await api.post('passengers/', { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, passport_number: form.passport_number, nationality: form.nationality, date_of_birth: form.date_of_birth })
      await api.post('tickets/', { ticket_number: `AUTO-${Date.now()}`, flight_id: selected.id, passenger_id: p.data.id, seat_number: form.seat_number || 'AUTO', ticket_class: form.ticket_class, price: estimated.toFixed(2) })
      nav('/tickets')
    }catch(err){
      const msg = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : err.message
      setError(msg)
    }finally{ setSubmitting(false) }
  }

  return (
    <div className="book-page container">
      <div className="book-grid">
        <aside className="flights-list card">
          <div className="list-head">
            <h3>Available Flights</h3>
            <div className="search-row"><input placeholder="Search by flight, origin, destination" value={query} onChange={e=>setQuery(e.target.value)} /></div>
          </div>

          {loading && <p>Loading…</p>}
          {!loading && filtered.length === 0 && <p className="muted">No flights found.</p>}

          <ul className="list">
            {filtered.map(f => (
              <li key={f.id} className={`list-item ${selected && selected.id === f.id ? 'active' : ''}`} onClick={()=>{ setSelected(f); setForm({...form, ticket_class:'Economy'}); setStep(1); setError(null) }}>
                <div className="title">{f.flight_number} <span className="muted">— {f.status}</span></div>
                <div className="route">{f.origin_airport?.code} → {f.destination_airport?.code}</div>
                <div className="times muted">{new Date(f.departure_time).toLocaleString()} — {new Date(f.arrival_time).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </aside>

        <main className="book-panel card">
          {!selected && (
            <div className="empty">Select a flight to begin booking</div>
          )}

          {selected && (
            <>
              <div className="flight-header">
                <div>
                  <h2>{selected.flight_number} <span className="muted">— {selected.status}</span></h2>
                  <div className="route-large">{selected.origin_airport?.code} → {selected.destination_airport?.code}</div>
                  <div className="muted">{new Date(selected.departure_time).toLocaleString()} — {new Date(selected.arrival_time).toLocaleString()}</div>
                </div>
                <div className="price-box">
                  <div className="label muted">Estimated fare</div>
                  <div className="price">{currencyFormat(estimated)}</div>
                </div>
              </div>

              <form className="book-form" onSubmit={step === 1 ? (e) => { e.preventDefault(); proceedToSeatSelection() } : book}>
                {step === 1 ? (
                  // Step 1: Passenger Information
                  <div className="form-grid">
                    <h3>Passenger Information</h3>
                    <label className="field">
                      <span>First name</span>
                      <input value={form.first_name} onChange={e=>update('first_name', e.target.value)} required />
                    </label>

                    <label className="field">
                      <span>Last name</span>
                      <input value={form.last_name} onChange={e=>update('last_name', e.target.value)} required />
                    </label>

                    <label className="field">
                      <span>Email</span>
                      <input type="email" value={form.email} onChange={e=>update('email', e.target.value)} required />
                    </label>

                    <label className="field">
                      <span>Phone</span>
                      <input value={form.phone} onChange={e=>update('phone', e.target.value)} required />
                    </label>

                    <label className="field">
                      <span>Passport number</span>
                      <input value={form.passport_number} onChange={e=>update('passport_number', e.target.value)} required />
                    </label>

                    <label className="field">
                      <span>Nationality</span>
                      <input value={form.nationality} onChange={e=>update('nationality', e.target.value)} required />
                    </label>

                    <label className="field">
                      <span>Date of birth</span>
                      <input type="date" value={form.date_of_birth} onChange={e=>update('date_of_birth', e.target.value)} />
                    </label>

                    {error && <div className="server-error">{error}</div>}

                    <div className="actions">
                      <button className="btn primary" type="submit">Next: Select Seat</button>
                      <button type="button" className="btn secondary" onClick={()=>{ setSelected(null); setError(null) }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  // Step 2: Seat Selection
                  <div className="form-grid">
                    <h3>Select Your Seat</h3>

                    <div style={{background:'var(--card)',padding:12,borderRadius:8,marginBottom:16,gridColumn:'1 / -1',border:'1px solid var(--input-border)',color:'var(--text-light)'}}>
                      <div style={{fontWeight:600,marginBottom:4,color:'var(--accent)'}}>Passenger</div>
                      <div style={{color:'var(--text-light)'}}>{form.first_name} {form.last_name} ({form.email})</div>
                    </div>

                    <label className="field" style={{gridColumn:'1 / -1'}}>
                      <span>Seat Selection</span>
                      {selected && selected.plane_type && seatMapData ? (
                        <div className="seat-meta" style={{marginTop: '16px', width: '100%'}}>
                          <div className="aircraft-info" style={{marginBottom: '12px'}}>
                            Aircraft: <strong>{selected.plane_type.name}</strong> ({selected.plane_type.code}) • Seats: {selected.plane_type.total_seats}
                          </div>
                          <div className="seat-legend" style={{marginBottom: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                            <span className="legend-item"><span className="legend-dot first"></span> First Class</span>
                            <span className="legend-item"><span className="legend-dot business"></span> Business Class</span>
                            <span className="legend-item"><span className="legend-dot economy"></span> Economy Class</span>
                            <span className="legend-item"><span className="legend-dot taken"></span> Taken</span>
                            <span className="legend-item"><span className="legend-dot selected"></span> Selected</span>
                          </div>
                          <div className="custom-seat-map" style={{
                            width: '100%',
                            maxHeight: '600px',
                            overflowY: 'auto',
                            padding: '20px',
                            background: 'var(--input-bg)',
                            borderRadius: '8px',
                            border: '1px solid var(--input-border)',
                            position: 'relative'
                          }}>
                            {/* Airplane Nose - Curved design */}
                            <div className="airplane-nose" style={{
                              position: 'absolute',
                              top: '0',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: '100%',
                              maxWidth: '600px',
                              height: '100px',
                              pointerEvents: 'none',
                              zIndex: 1
                            }}>
                              <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="xMidYMin meet" style={{ overflow: 'visible' }}>
                                <defs>
                                  <linearGradient id={`noseGradient-${selected?.id || 'default'}`} x1="300" y1="0" x2="300" y2="100" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" style={{ stopColor: '#88857c', stopOpacity: 0.9 }} />
                                    <stop offset="50%" style={{ stopColor: '#88857c', stopOpacity: 0.6 }} />
                                    <stop offset="100%" style={{ stopColor: '#88857c', stopOpacity: 0.2 }} />
                                  </linearGradient>
                                  <linearGradient id={`noseGradient2-${selected?.id || 'default'}`} x1="0" y1="0" x2="600" y2="0" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" style={{ stopColor: '#88857c', stopOpacity: 0.1 }} />
                                    <stop offset="50%" style={{ stopColor: '#88857c', stopOpacity: 0.8 }} />
                                    <stop offset="100%" style={{ stopColor: '#88857c', stopOpacity: 0.1 }} />
                                  </linearGradient>
                                </defs>
                                {/* Left curve - more pronounced */}
                                <path
                                  d="M 300 0 Q 150 30, 60 70 Q 30 85, 0 100"
                                  fill="none"
                                  stroke={`url(#noseGradient-${selected?.id || 'default'})`}
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {/* Right curve - more pronounced */}
                                <path
                                  d="M 300 0 Q 450 30, 540 70 Q 570 85, 600 100"
                                  fill="none"
                                  stroke={`url(#noseGradient-${selected?.id || 'default'})`}
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {/* Fill area for nose shape */}
                                <path
                                  d="M 300 0 Q 150 30, 60 70 Q 30 85, 0 100 L 600 100 Q 570 85, 540 70 Q 450 30, 300 0 Z"
                                  fill={`url(#noseGradient2-${selected?.id || 'default'})`}
                                  opacity="0.3"
                                />
                              </svg>
                            </div>
                            
                            <div style={{ marginTop: '100px' }}>
                            {seatMapData.rows.map(({ row, seats }) => {
                              // Split seats into left and right banks
                              // Find the natural aisle gap in seat columns
                              const sortedCols = seats.map(s => s.col).sort((a, b) => a - b)
                              // Find largest gap between consecutive columns (where aisle would be)
                              let maxGap = 0
                              let gapIndex = Math.floor(sortedCols.length / 2)
                              for (let i = 0; i < sortedCols.length - 1; i++) {
                                const gap = sortedCols[i + 1] - sortedCols[i]
                                if (gap > maxGap && gap > 1) {
                                  maxGap = gap
                                  gapIndex = i + 1
                                }
                              }
                              // Split at the largest gap, or middle if no clear gap
                              const splitCol = maxGap > 1 ? sortedCols[gapIndex] : sortedCols[Math.floor(sortedCols.length / 2)]
                              const leftSeats = seats.filter(s => s.col < splitCol)
                              const rightSeats = seats.filter(s => s.col >= splitCol)
                              
                              return (
                                <div key={row} className="seat-row-container" style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  marginBottom: '8px',
                                  minHeight: '40px',
                                  width: '100%',
                                  position: 'relative',
                                  justifyContent: 'center'
                                }}>
                                  <div className="row-number" style={{
                                    minWidth: '30px',
                                    textAlign: 'right',
                                    fontWeight: '600',
                                    color: 'var(--text-light)',
                                    fontSize: '0.9rem',
                                    flexShrink: 0
                                  }}>{row}</div>
                                  
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    justifyContent: 'center'
                                  }}>
                                    <div className="seat-bank-left" style={{ display: 'flex', gap: '4px' }}>
                                    {leftSeats.map(seat => (
                                      <button
                                        key={seat.label}
                                        type="button"
                                        onClick={() => {
                                          if (seat.taken || !seat.selectable) return
                                          update('seat_number', seat.label)
                                        }}
                                        disabled={seat.taken || !seat.selectable}
                                        className={`custom-seat ${seat.class.toLowerCase()} ${seat.taken ? 'taken' : ''} ${form.seat_number === seat.label ? 'selected' : ''} ${seat.selectable ? 'selectable' : ''}`}
                                        title={seat.taken ? `${seat.label} - Taken` : `${seat.label} - ${seat.class}`}
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          borderRadius: '4px',
                                          border: `1px solid ${seat.taken ? '#666' : form.seat_number === seat.label ? 'var(--accent)' : '#88857c'}`,
                                          background: seat.taken ? '#1a1a1a' : form.seat_number === seat.label ? '#ffe2ae' : 
                                            seat.class === 'First' ? 'linear-gradient(90deg, #BDB76B, #D4AF37)' :
                                            seat.class === 'Business' ? 'linear-gradient(90deg, #1a3a1a, #264226)' : '#e6e7e9',
                                          color: seat.taken ? '#666' : '#000',
                                          cursor: (seat.taken || !seat.selectable) ? 'not-allowed' : 'pointer',
                                          opacity: seat.taken ? 0.5 : 1,
                                          fontWeight: '600',
                                          fontSize: '0.75rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease',
                                          boxShadow: form.seat_number === seat.label ? '0 0 8px rgba(231, 194, 98, 0.5)' : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!seat.taken && seat.selectable) {
                                            e.target.style.transform = 'translateY(-2px)'
                                            e.target.style.boxShadow = '0 4px 12px rgba(231, 194, 98, 0.4)'
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (form.seat_number !== seat.label) {
                                            e.target.style.transform = 'translateY(0)'
                                            e.target.style.boxShadow = 'none'
                                          }
                                        }}
                                      >
                                        {seat.letter}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  <div className="aisle" style={{ width: '20px', minWidth: '20px', flexShrink: 0 }}></div>
                                  
                                  <div className="seat-bank-right" style={{ display: 'flex', gap: '4px' }}>
                                    {rightSeats.map(seat => (
                                      <button
                                        key={seat.label}
                                        type="button"
                                        onClick={() => {
                                          if (seat.taken || !seat.selectable) return
                                          update('seat_number', seat.label)
                                        }}
                                        disabled={seat.taken || !seat.selectable}
                                        className={`custom-seat ${seat.class.toLowerCase()} ${seat.taken ? 'taken' : ''} ${form.seat_number === seat.label ? 'selected' : ''} ${seat.selectable ? 'selectable' : ''}`}
                                        title={seat.taken ? `${seat.label} - Taken` : `${seat.label} - ${seat.class}`}
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          borderRadius: '4px',
                                          border: `1px solid ${seat.taken ? '#666' : form.seat_number === seat.label ? 'var(--accent)' : '#88857c'}`,
                                          background: seat.taken ? '#1a1a1a' : form.seat_number === seat.label ? '#ffe2ae' : 
                                            seat.class === 'First' ? 'linear-gradient(90deg, #BDB76B, #D4AF37)' :
                                            seat.class === 'Business' ? 'linear-gradient(90deg, #1a3a1a, #264226)' : '#e6e7e9',
                                          color: seat.taken ? '#666' : '#000',
                                          cursor: (seat.taken || !seat.selectable) ? 'not-allowed' : 'pointer',
                                          opacity: seat.taken ? 0.5 : 1,
                                          fontWeight: '600',
                                          fontSize: '0.75rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease',
                                          boxShadow: form.seat_number === seat.label ? '0 0 8px rgba(231, 194, 98, 0.5)' : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!seat.taken && seat.selectable) {
                                            e.target.style.transform = 'translateY(-2px)'
                                            e.target.style.boxShadow = '0 4px 12px rgba(231, 194, 98, 0.4)'
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (form.seat_number !== seat.label) {
                                            e.target.style.transform = 'translateY(0)'
                                            e.target.style.boxShadow = 'none'
                                          }
                                        }}
                                      >
                                        {seat.letter}
                                      </button>
                                    ))}
                                  </div>
                                  </div>
                                </div>
                              )
                            })}
                            </div>
                          </div>
                          <div style={{marginTop: '12px', fontSize: '0.85rem', color: 'var(--muted)'}}>
                            Selected seat: <strong style={{color: 'var(--accent)'}}>{form.seat_number || 'None'}</strong>
                          </div>
                        </div>
                      ) : selected && selected.plane_type ? (
                        <div style={{padding: '20px', textAlign: 'center', color: 'var(--muted)'}}>
                          Preparing seat map...
                        </div>
                      ) : (
                        <div style={{padding: '20px', textAlign: 'center', color: 'var(--muted)'}}>
                          Please select a flight to view seat map
                        </div>
                      )}
                    </label>

                    <label className="field">
                      <span>Ticket class</span>
                      <select value={form.ticket_class} onChange={e=>update('ticket_class', e.target.value)}>
                        <option>Economy</option>
                        <option>Business</option>
                        <option>First</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Promo code</span>
                      <div style={{display:'flex',gap:8}}>
                        <input value={form.promo_code} onChange={e=>update('promo_code', e.target.value)} placeholder="SAVE10 or SAVE25" />
                        <button type="button" className="btn small" onClick={applyPromo}>Apply</button>
                      </div>
                      {promo.applied && <small className="muted">Promo applied — {(promo.discount*100).toFixed(0)}% off</small>}
                    </label>

                    {error && <div className="server-error">{error}</div>}

                    <div className="actions">
                      <button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'Booking…' : `Confirm Booking for ${currencyFormat(estimated)}`}</button>
                      <button type="button" className="btn secondary" onClick={backToPassengerInfo} disabled={submitting}>Back</button>
                    </div>
                  </div>
                )}
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
