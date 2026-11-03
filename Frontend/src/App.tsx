import { Component } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './lib/context'
import type { Role } from './lib/types'
import Layout from './components/Layout'
import { Empty, Loading } from './components/ui'
import Auth from './pages/Auth'
import Feed from './pages/Feed'
import ReportDetail from './pages/ReportDetail'
import Reports from './pages/Reports'
import Locations from './pages/Locations'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  render() { return this.state.error ? <div className="fatal-error"><h1>Let’s get you back on track.</h1><p>Something unexpected happened in the workspace.</p><button className="btn primary" onClick={() => window.location.reload()}>Reload workspace</button></div> : this.props.children }
}
function RequireAuth() {
  const { session, ready, sessionError, retrySession, logout } = useApp()
  if (sessionError) return <div className="session-recovery" role="alert"><h1>Let’s reconnect your workspace.</h1><p>{sessionError}</p><button className="btn primary" onClick={retrySession}>Retry connection</button><button className="btn secondary" onClick={logout}>Back to sign in</button></div>
  return !ready ? <Loading /> : session ? <Outlet /> : <Navigate to="/login" replace />
}
function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) { const { session } = useApp(); return roles.includes(session!.user.role) ? children : <Navigate to="/feed" replace /> }
export default function App() {
  return <ErrorBoundary><BrowserRouter><AppProvider><Routes><Route path="/login" element={<Auth />} /><Route element={<RequireAuth />}><Route element={<Layout />}><Route index element={<Navigate to="/feed" replace />} /><Route path="feed" element={<Feed />} /><Route path="my-reports" element={<Reports mode="mine" />} /><Route path="maintenance" element={<Reports mode="maintenance" />} /><Route path="locations" element={<Locations />} /><Route path="reports/:id" element={<ReportDetail />} /><Route path="assignments" element={<RoleGate roles={['technician']}><Reports mode="assigned" /></RoleGate>} /><Route path="administration" element={<RoleGate roles={['admin']}><Reports mode="admin" /></RoleGate>} /><Route path="analytics" element={<RoleGate roles={['admin']}><Analytics /></RoleGate>} /><Route path="settings" element={<Settings />} /><Route path="*" element={<Empty title="This path needs a little care." text="We couldn’t find that page." action={<a className="btn primary" href="/feed">Back to the feed</a>} />} /></Route></Route></Routes></AppProvider></BrowserRouter></ErrorBoundary>
}
