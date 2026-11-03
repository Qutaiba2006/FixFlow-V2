import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Leaf, LoaderCircle } from 'lucide-react'
import { useApp } from '../lib/context'
import { request } from '../lib/api'
import { Brand } from '../components/ui'
import ThemeToggle from '../components/ThemeToggle'
export default function Auth() {
  const { session, login, notify } = useApp()
  const [register, setRegister] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (session) return <Navigate to="/feed" replace />
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget)
    try { const email = String(data.get('email')); const password = String(data.get('password')); if (register) { await request('/auth/register', { method: 'POST', body: { name: data.get('name'), email, password } }); notify('Your account is ready. Welcome to FixFlow!') }; await login(email, password) } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  return <div className="auth-page"><section className="auth-story"><Brand /><div className="auth-story-copy"><span className="eyebrow"><span className="tiny-spark">✳</span> A LITTLE CARE GOES A LONG WAY</span><h1>Good campuses<br />don’t just happen.<br /><em>We make them.</em></h1><p>A flickering light. A leaky tap. A space that could be better. Let’s turn the things we notice into the changes we need.</p><img src="/illustrations/campus.svg" alt="Illustration of a welcoming green campus with trees and sun" /><div className="auth-proof"><span>One campus. Every voice matters.</span><Leaf size={18} /></div></div><span className="auth-footnote">FIXFLOW · THE CAMPUS CARE PLATFORM</span></section><section className="auth-panel"><div className="auth-controls"><ThemeToggle compact /></div><div className="auth-form-wrap"><span className="eyebrow">YOUR CAMPUS, CONNECTED</span><h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2><p>{register ? 'A better campus starts with you.' : 'Let’s make a little progress today.'}</p><div className="auth-tabs"><button className={!register ? 'active' : ''} onClick={() => { setRegister(false); setError('') }}>Sign in</button><button className={register ? 'active' : ''} onClick={() => { setRegister(true); setError('') }}>Create account</button></div><form className="form-stack" onSubmit={submit}>{register && <label>Your name<input name="name" autoComplete="name" required placeholder="Enter your full name" maxLength={100} /></label>}<label>Email address<input type="email" name="email" autoComplete="email" required placeholder="you@university.edu" /></label><label>Password<div className="password-field"><input name="password" type={visible ? 'text' : 'password'} minLength={register ? 8 : 1} autoComplete={register ? 'new-password' : 'current-password'} required placeholder={register ? 'At least 8 characters' : 'Enter your password'} /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{register && <p className="field-hint">New accounts join as students. Staff roles are managed by your campus.</p>}{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{busy ? 'One moment…' : register ? 'Create your account' : 'Sign in to your workspace'}<ArrowRight size={17} /></button></form></div><p className="auth-bottom">Made for the people who make campus better.<span>✳</span></p></section></div>
}
