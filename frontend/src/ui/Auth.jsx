import React, { useState, useEffect } from 'react'
import api from '../api'

export default function Auth(){
  const [user, setUser] = useState(localStorage.getItem('username') || null)
  const [loginForm, setLoginForm] = useState({ username:'', password:'' })
  const [regForm, setRegForm] = useState({ username:'', password:'', email:'' })

  useEffect(()=>{
    const token = localStorage.getItem('access_token')
    if (!token) setUser(null)
  }, [])

  async function login(e){
    e.preventDefault()
    try{
      const r = await api.post('token/', loginForm)
      localStorage.setItem('access_token', r.data.access)
      localStorage.setItem('refresh_token', r.data.refresh)
      localStorage.setItem('username', loginForm.username)
      setUser(loginForm.username)
      setLoginForm({ username:'', password:'' })
    }catch(err){ alert('Login failed: '+ JSON.stringify(err.response?.data || err.message)) }
  }

  async function register(e){
    e.preventDefault()
    try{
      const r = await api.post('register/', regForm)
      localStorage.setItem('access_token', r.data.access)
      localStorage.setItem('refresh_token', r.data.refresh)
      localStorage.setItem('username', regForm.username)
      setUser(regForm.username)
    }catch(err){ alert('Register failed: '+ JSON.stringify(err.response?.data || err.message)) }
  }

  function logout(){
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('username')
    setUser(null)
    // Notify rest of app
    window.dispatchEvent(new Event('auth'))
  }

  if (user) return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <span style={{color:'white'}}>{user}</span>
      <button className="btn ghost" onClick={logout}>Logout</button>
    </div>
  )

  return (
    <div style={{display:'flex',gap:12,alignItems:'center'}}>
      <form onSubmit={login} style={{display:'flex',gap:8,alignItems:'center'}}>
        <input placeholder="username" value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username:e.target.value})} />
        <input placeholder="password" type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})} />
        <button className="btn" type="submit">Login</button>
      </form>

      <div className="card" style={{padding:8}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>Create account</div>
        <form onSubmit={register} style={{display:'flex',flexDirection:'column',gap:6}}>
          <input placeholder="username" value={regForm.username} onChange={e=>setRegForm({...regForm, username:e.target.value})} />
          <input placeholder="email" value={regForm.email} onChange={e=>setRegForm({...regForm, email:e.target.value})} />
          <input placeholder="password" type="password" value={regForm.password} onChange={e=>setRegForm({...regForm, password:e.target.value})} />
          <button className="btn secondary" type="submit">Create</button>
        </form>
      </div>
    </div>
  )
}
