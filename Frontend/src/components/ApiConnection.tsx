import { useState } from 'react'
import { CheckCheck, Database, LoaderCircle, RefreshCw } from 'lucide-react'
import { verifyApi } from '../lib/api'

export default function ApiConnection() {
  const [state, setState] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle')
  const [error, setError] = useState('')
  const check = async () => {
    setState('checking'); setError('')
    try { await verifyApi(); setState('online') }
    catch (err) { setError((err as Error).message); setState('offline') }
  }
  return <div className={`api-connection ${state}`}>
    <div className="api-connection-heading"><Database size={16} /><strong>Campus connection</strong><span>{state === 'online' ? 'Available' : state === 'checking' ? 'Checking…' : state === 'offline' ? 'Unavailable' : 'Ready to connect'}</span></div>
    <p>{state === 'online' ? 'The campus service is available. Sign in to access your workspace.' : 'Connect to your campus to share reports and follow maintenance updates.'}</p>
    <button type="button" className="text-link" onClick={check} disabled={state === 'checking'}>{state === 'checking' ? <LoaderCircle className="spin" size={13} /> : state === 'online' ? <CheckCheck size={13} /> : <RefreshCw size={13} />}{state === 'checking' ? 'Checking connection…' : state === 'online' ? 'Check again' : 'Check API connection'}</button>
    {error && <p className="connection-error" role="alert">{error}</p>}
  </div>
}
