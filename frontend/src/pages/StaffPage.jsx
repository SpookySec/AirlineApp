import React, { useEffect, useState } from 'react'
import api from '../api'

export default function StaffPage(){
  const [staff, setStaff] = useState([])
  useEffect(()=>{ api.get('staff/?page_size=50').then(r=>setStaff(r.data.results || r.data)) }, [])

  return (
    <div className="container">
      <h2>Staff</h2>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead>
        <tbody>{staff.map(s => <tr key={s.id}><td>{s.first_name} {s.last_name}</td><td>{s.role}</td><td>{s.email}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
