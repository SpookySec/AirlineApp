import React, { useEffect, useState } from 'react'
import api from '../api'

export default function PassengersPage(){
  const [list, setList] = useState([])
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', passport_number:'', date_of_birth:'1990-01-01' })

  useEffect(()=>{ api.get('passengers/?page_size=50').then(r=>setList(r.data.results || r.data)) }, [])

  async function create(e){ e.preventDefault(); try{ await api.post('passengers/', form); const r = await api.get('passengers/?page_size=50'); setList(r.data.results || r.data); alert('Created') }catch(err){ alert('Error: '+JSON.stringify(err.response?.data || err.message)) } }

  return (
    <div className="container">
      <h2>Passengers</h2>
      <form onSubmit={create}>
        <div className="form-row"><input placeholder="First name" value={form.first_name} onChange={e=>setForm({...form, first_name:e.target.value})} required/></div>
        <div className="form-row"><input placeholder="Last name" value={form.last_name} onChange={e=>setForm({...form, last_name:e.target.value})} required/></div>
        <div className="form-row"><input placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required/></div>
        <div className="form-row"><input placeholder="Passport" value={form.passport_number} onChange={e=>setForm({...form, passport_number:e.target.value})} required/></div>
        <div className="form-row"><input type="date" value={form.date_of_birth} onChange={e=>setForm({...form, date_of_birth:e.target.value})} required/></div>
        <div><button type="submit">Register Passenger</button></div>
      </form>

      <h3>Registered</h3>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Passport</th></tr></thead>
        <tbody>{list.map(p=> <tr key={p.id}><td>{p.first_name} {p.last_name}</td><td>{p.email}</td><td>{p.passport_number}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
