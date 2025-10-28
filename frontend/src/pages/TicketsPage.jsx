import React, { useEffect, useState } from 'react'
import api from '../api'

export default function TicketsPage(){
  const [tickets, setTickets] = useState([])
  useEffect(()=>{ api.get('tickets/?page_size=50').then(r=>setTickets(r.data.results || r.data)) }, [])

  return (
    <div className="container">
      <h2>My Tickets</h2>
      <div className="ticket-list">
        {tickets.map(t=> (
          <div key={t.id} className="ticket">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontWeight:700}}>{t.ticket_number}</div>
              <div className="muted">{t.status}</div>
            </div>
            <div style={{marginTop:8}}><strong>{t.flight?.flight_number}</strong> — {t.flight?.origin} → {t.flight?.destination}</div>
            <div className="muted" style={{marginTop:6}}>{t.passenger?.first_name} {t.passenger?.last_name} • Seat {t.seat_number || 'N/A'}</div>
            <div style={{marginTop:8}}><span className="badge">{t.ticket_class}</span> <span style={{marginLeft:8,fontWeight:600}}>Price: ${t.price}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}
