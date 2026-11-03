import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, request } from './api'
import type { Session } from './api'
import type { User } from './types'

interface AuthValue {
  session: Session | null
  ready: boolean
  sessionError: string
  retrySession: () => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  api: <T>(path: string, method?: string, body?: unknown) => Promise<T>
  notify: (message: string, error?: boolean) => void
  revision: number
  refresh: () => void
}
const Context = createContext<AuthValue | null>(null)
const KEY = 'fixflow-session'
function load(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return value?.user?.id && ['student', 'technician', 'admin'].includes(value.user.role) && typeof value.token === 'string' && value.token ? value : null
  } catch { return null }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(load)
  const [ready, setReady] = useState(() => !load())
  const [sessionError, setSessionError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null)
  const [revision, setRevision] = useState(0)
  const save = useCallback((value: Session | null) => {
    setSession(value)
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value))
    else sessionStorage.removeItem(KEY)
  }, [])
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), [])
  useEffect(() => {
    let active = true
    const initial = load()
    if (initial) {
      request<{ user: User }>('/auth/me', { session: initial }).then(result => {
        if (active) { save({ ...initial, user: result.user }); setSessionError(''); setReady(true) }
      }).catch(error => {
        if (!active) return
        if (error instanceof ApiError && error.status === 401) { save(null); setReady(true) }
        else setSessionError(error.message)
      })
    }
    const expired = () => { save(null); setSessionError(''); setReady(true); notify('Your session has ended. Please sign in again.', true) }
    window.addEventListener('fixflow-session-expired', expired)
    return () => { active = false; window.removeEventListener('fixflow-session-expired', expired) }
  }, [save, notify, restoreAttempt])
  useEffect(() => {
    if (toast) { const timer = setTimeout(() => setToast(null), 5500); return () => clearTimeout(timer) }
  }, [toast])
  const api = useCallback(<T,>(path: string, method = 'GET', body?: unknown) => request<T>(path, { method, body, session }), [session])
  const login = async (email: string, password: string) => {
    const result = await request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: { email, password } })
    save({ user: result.user, token: result.token }); setSessionError(''); setReady(true)
  }
  const logout = () => { save(null); setSessionError(''); setReady(true) }
  const retrySession = () => { setSessionError(''); setReady(false); setRestoreAttempt(v => v + 1) }
  return <Context.Provider value={{ session, ready, sessionError, retrySession, login, logout, api, notify, revision, refresh: () => setRevision(v => v + 1) }}>{children}{toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}><span>{toast.error ? '!' : '✓'}</span>{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></div>}</Context.Provider>
}
export function useApp() { const value = useContext(Context); if (!value) throw new Error('Missing AppProvider'); return value }
