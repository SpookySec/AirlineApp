import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import './Login.css'

export default function Login(){
  const navigate = useNavigate()
  const [form, setForm] = useState({ username:'', password:'', remember:false })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    if(!form.username.trim() || !form.password) return setError('Please provide username and password.')
    setLoading(true)
    try{
      const res = await api.post('token/', { username: form.username, password: form.password })
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      if(form.remember) localStorage.setItem('username', form.username)
      else localStorage.removeItem('username')
      // notify app about auth change so navbar updates
      window.dispatchEvent(new Event('auth'))
      navigate('/')
    }catch(err){
      const msg = err.response?.data || err.message || 'Login failed.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }finally{ setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Welcome back</h2>
        <p className="muted">Log in to manage bookings, view tickets, and more.</p>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="field">
            <span>Username</span>
            <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} autoComplete="username" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} autoComplete="current-password" required />
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={form.remember} onChange={e=>setForm({...form, remember:e.target.checked})} />
            <span>Remember me</span>
          </label>

          {error && <div className="error-box">{error}</div>}

          <div className="actions">
            <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
            <Link className="link-ghost" to="/register">Create account</Link>
          </div>

          {/* Removed "Forgot password?" per request */}
        </form>
      </div>
    </div>
  )
}
