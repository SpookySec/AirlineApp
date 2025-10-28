import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

export default function FlightDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', passport_number:'', nationality:'', date_of_birth:'1990-01-01', seat_number:'', ticket_class:'Economy', price:'0.00', ticket_number:'' })

  useEffect(()=>{
    api.get(`flights/${id}/`).then(r=>{ setFlight(r.data); setLoading(false) }).catch(()=>setLoading(false))
  }, [id])

  async function book(e){
    e.preventDefault()
    try{
      const p = await api.post('passengers/', { first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, passport_number: form.passport_number, nationality: form.nationality, date_of_birth: form.date_of_birth })
      await api.post('tickets/', { ticket_number: form.ticket_number || `AUTO-${Date.now()}`, flight_id: id, passenger_id: p.data.id, seat_number: form.seat_number, ticket_class: form.ticket_class, price: form.price })
      nav('/tickets')
    }catch(err){
      const msg = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : err.message
      setForm({...form, _error: msg})
    }
  }

  if (loading) return <p>Loading…</p>
  if (!flight) return <p>Flight not found</p>

  return (
    <div className="container">
      <div className="card">
        <div className="card-title">{flight.flight_number} <span className="muted">— {flight.status}</span></div>
        <div className="flight-route">{flight.origin} → {flight.destination}</div>
        <div className="flight-time">{new Date(flight.departure_time).toLocaleString()} — {new Date(flight.arrival_time).toLocaleString()}</div>

        {flight.flight_staff && flight.flight_staff.length > 0 && (
          <div className="staff-list">
            <h4 style={{marginTop:12}}>Flight staff</h4>
            <ul>{flight.flight_staff.map(s => <li key={s.id}>{s.first_name} {s.last_name} — {s.assigned_role}</li>)}</ul>
          </div>
        )}

        <h3 style={{marginTop:16}}>Book a ticket</h3>
        <form className="form" onSubmit={book}>
          <div className="form-row">
            <label>First name <input value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} required/></label>
            <label>Last name <input value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} required/></label>
          </div>

          <div className="form-row">
            <label>Email <input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required/></label>
            <label>Phone <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} /></label>
          </div>

          <div className="form-row">
            <label>Passport <input value={form.passport_number} onChange={e=>setForm({...form, passport_number:e.target.value})} required/></label>
            <label>Nationality <input value={form.nationality} onChange={e=>setForm({...form, nationality:e.target.value})} required/></label>
          </div>

          <div className="form-row">
            <label>DOB <input type="date" value={form.date_of_birth} onChange={e=>setForm({...form, date_of_birth:e.target.value})} required/></label>
            <label>Seat <input value={form.seat_number} onChange={e=>setForm({...form, seat_number:e.target.value})} /></label>
          </div>

          <div className="form-row">
            <label>Ticket class <select value={form.ticket_class} onChange={e=>setForm({...form, ticket_class:e.target.value})}><option>Economy</option><option>Business</option><option>First</option></select></label>
            <label>Ticket number (optional) <input value={form.ticket_number} onChange={e=>setForm({...form, ticket_number:e.target.value})} /></label>
          </div>

          {form._error && <div style={{color:'var(--danger)'}}>{form._error}</div>}

          <div style={{display:'flex',gap:8}}>
            <button className="btn" type="submit">Book now</button>
            <button type="button" className="btn secondary" onClick={()=>nav(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
