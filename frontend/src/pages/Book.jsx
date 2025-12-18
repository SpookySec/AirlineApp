import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function Book(){
  const nav = useNavigate()
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
  

  useEffect(()=>{
    setLoading(true)
    api.get('flights/?page_size=50')
      .then(r=>setFlights(r.data.results || r.data))
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [])

  

  const filtered = useMemo(()=>{
    if(!query.trim()) return flights
    const q = query.trim().toLowerCase()
    return flights.filter(f=> (f.flight_number||'').toLowerCase().includes(q) || (f.origin||'').toLowerCase().includes(q) || (f.destination||'').toLowerCase().includes(q))
  }, [flights, query])

  const basePrice = useMemo(()=> selected ? deterministicBasePrice(selected) : 0, [selected])
  const estimated = useMemo(()=>{
    if(!selected) return 0
    const mult = CLASS_MULTIPLIERS[form.ticket_class] || 1
    const raw = basePrice * mult
    const afterPromo = promo.applied ? raw * (1 - promo.discount) : raw
    return Number(afterPromo)
  }, [selected, form.ticket_class, basePrice, promo])

  function update(field, value){ setForm(prev=> ({...prev, [field]: value})); setError(null) }

  // simple seat grid generator (6 seats per row, letters A-F) and class bands
  function buildSeats(){
    if(!selected || !selected.aircraft) return []
    const capacity = selected.aircraft.capacity || 120
    const seatsPerRow = 6
    const rows = Math.ceil(capacity / seatsPerRow)
    const firstRows = Math.max(1, Math.round(rows * 0.08))
    const businessRows = Math.max(1, Math.round(rows * 0.18))
    const letters = ['A','B','C','D','E','F']
    const seats = []
    for(let r=1; r<=rows; r++){
      let klass = 'Economy'
      if(r <= firstRows) klass = 'First'
      else if(r <= firstRows + businessRows) klass = 'Business'
      for(let c=0; c<seatsPerRow; c++){
        const idx = (r-1) * seatsPerRow + c
        if(idx >= capacity) break
        seats.push({ label:`${r}${letters[c]}`, row:r, col:c, class: klass })
      }
    }
    return seats
  }

  const seatLayout = useMemo(() => buildSeats(), [selected])

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
                <div className="route">{f.origin} → {f.destination}</div>
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
                  <div className="route-large">{selected.origin} → {selected.destination}</div>
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
                      <span>Seat (optional)</span>
                      <input value={form.seat_number} onChange={e=>update('seat_number', e.target.value)} placeholder="e.g., 12A" />
                      {selected && selected.aircraft && (
                        <div className="seat-meta">
                          <div className="aircraft-info">Aircraft: <strong>{selected.aircraft.model}</strong> ({selected.aircraft.registration_code}) • Capacity: {selected.aircraft.capacity}</div>
                          <div className="seat-grid">
                            {seatLayout.map(s => {
                              const taken = takenSeats.has(s.label)
                              const selectable = !taken && s.class === form.ticket_class
                              const selectedThis = form.seat_number === s.label
                              return (
                                <button
                                  key={s.label}
                                  type="button"
                                  aria-pressed={selectedThis}
                                  aria-disabled={taken}
                                  className={`seat ${s.class.toLowerCase()} ${taken ? 'taken' : ''} ${selectedThis ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
                                  onClick={()=>{ if(taken) return; if(s.class !== form.ticket_class) return; update('seat_number', s.label) }}
                                  title={`${s.label} — ${s.class}${taken ? ' (taken)' : ''}`}
                                >{s.label}</button>
                              )
                            })}
                          </div>
                          <div className="seat-legend">
                            <span className="legend-item"><span className="legend-dot first"></span> First</span>
                            <span className="legend-item"><span className="legend-dot business"></span> Business</span>
                            <span className="legend-item"><span className="legend-dot economy"></span> Economy</span>
                            <span className="legend-item"><span className="legend-dot taken"></span> Taken</span>
                          </div>
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
