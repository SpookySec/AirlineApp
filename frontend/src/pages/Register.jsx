import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './Register.css'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function passwordStrength(pw){
  let score = 0
  if(!pw) return score
  if(pw.length >= 8) score += 1
  if(/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1
  if(/\d/.test(pw)) score += 1
  if(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) score += 1
  return score // 0..4
}

export default function Register(){
  const navigate = useNavigate()
  const [form, setForm] = useState({ username:'', email:'', full_name:'', password:'', confirmPassword:'', acceptTerms:false })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => passwordStrength(form.password), [form.password])

  function validate(){
    const e = {}
    if(!form.username.trim()) e.username = 'Username is required.'
    if(!emailRegex.test(form.email)) e.email = 'Please enter a valid email address.'
    if(form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if(form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    if(!form.acceptTerms) e.acceptTerms = 'You must accept the terms and conditions.'
    return e
  }

  async function handleSubmit(ev){
    ev.preventDefault()
    setServerError(null)
    const e = validate()
    setErrors(e)
    if(Object.keys(e).length) return
    setLoading(true)
    try{
      // API expects: username, password, email, full_name
      const payload = { username: form.username, password: form.password, email: form.email, full_name: form.full_name }
      const res = await api.post('register/', payload)
      // on success the backend returns access + refresh tokens (see project's api)
      localStorage.setItem('access_token', res.data.access)
      localStorage.setItem('refresh_token', res.data.refresh)
      localStorage.setItem('username', form.username)
      // notify app about auth change so navbar updates
      window.dispatchEvent(new Event('auth'))
      navigate('/')
    }catch(err){
      const msg = err.response?.data || err.message || 'Registration failed.'
      setServerError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }finally{
      setLoading(false)
    }
  }

  function update(field, value){
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setServerError(null)
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <h2>Create an account</h2>
        <p className="muted">Fast, secure signup. You can manage bookings and view tickets once you register.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(e)=>update('username', e.target.value)}
                required
                autoComplete="username"
              />
              {errors.username && <small className="error">{errors.username}</small>}
            </label>

            <label className="field">
              <span>Full name</span>
              <input
                type="text"
                value={form.full_name}
                onChange={(e)=>update('full_name', e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
              />
            </label>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e)=>update('email', e.target.value)}
              required
              autoComplete="email"
            />
            {errors.email && <small className="error">{errors.email}</small>}
          </label>

          <div className="row">
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e)=>update('password', e.target.value)}
                required
                autoComplete="new-password"
              />
              <div className="pw-meta">
                <div className={`strength strength-${strength}`}></div>
                <small className="muted">{form.password ? ['Very weak','Weak','Okay','Strong','Very strong'][strength] : 'Choose a secure password'}</small>
              </div>
              {errors.password && <small className="error">{errors.password}</small>}
            </label>

            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e)=>update('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
              />
              {errors.confirmPassword && <small className="error">{errors.confirmPassword}</small>}
            </label>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e)=>update('acceptTerms', e.target.checked)}
            />
            <span>I agree to the <a href="#">terms and conditions</a>.</span>
          </label>
          {errors.acceptTerms && <small className="error">{errors.acceptTerms}</small>}

          {serverError && <div className="server-error">{serverError}</div>}

          <div className="actions">
            <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Registering…' : 'Create account'}</button>
            <button type="button" className="btn ghost" onClick={()=>navigate('/')} disabled={loading}>Back to Home</button>
          </div>
        </form>

        <div className="helper">
          Already have an account? <a href="/">Login</a>
        </div>
      </div>
    </div>
  )
}
