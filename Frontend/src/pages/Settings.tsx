import { Check, Database, ExternalLink, Monitor, Moon, Palette, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { useApp } from '../lib/context'
import { initials } from '../lib/utils'
import { useTheme } from '../lib/theme'
import { PageTitle } from '../components/ui'
import ApiConnection from '../components/ApiConnection'
import ThemeToggle from '../components/ThemeToggle'

export default function Settings() {
  const { session, logout } = useApp()
  const { preference, setPreference } = useTheme()
  const user = session!.user

  return <>
    <PageTitle eyebrow="MAKE YOURSELF AT HOME" title="Your little corner of FixFlow." description="Your profile, your workspace, and how it all connects." />
    <div className="settings-grid">
      <section className="settings-panel">
        <h2><UserRound size={19} />Your profile</h2>
        <div className="profile-preview"><span className="avatar large">{initials(user.name)}</span><div><h3>{user.name}</h3><p>{user.email}</p><span className="role-pill">{user.role}</span></div></div>
        <dl><div><dt>Name</dt><dd>{user.name}</dd></div><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Workspace access</dt><dd>{user.role === 'admin' ? 'Campus administration & analytics' : user.role === 'technician' ? 'Campus feed & assigned maintenance' : 'Campus feed & personal reports'}</dd></div></dl>
        <p className="settings-hint">Need to change your profile or role? Contact your campus administrator.</p>
        <button className="btn secondary" onClick={logout}>Sign out of FixFlow <ExternalLink size={15} /></button>
      </section>
      <div>
        <section className="settings-panel appearance-panel">
          <div className="appearance-heading"><h2><Palette size={19} />Make it your own</h2><ThemeToggle compact /></div>
          <p>Warm ivory by day. Deep forest by night. Choose a theme, or let your device decide.</p>
          <div className="theme-options" role="group" aria-label="Theme preference">
            <button aria-pressed={preference === 'light'} onClick={() => setPreference('light')}><Sun size={20} />Light</button>
            <button aria-pressed={preference === 'dark'} onClick={() => setPreference('dark')}><Moon size={20} />Dark</button>
            <button aria-pressed={preference === 'system'} onClick={() => setPreference('system')}><Monitor size={20} />System</button>
          </div>
        </section>
        <section className="settings-panel">
          <h2><Database size={19} />Your connection</h2>
          <ApiConnection />
        </section>
        <section className="settings-panel privacy-panel"><ShieldCheck size={25} /><h2>A campus that stays connected.</h2><p>Your reports and updates are saved through the campus API. Sign in to follow your reports and the work happening across campus.</p><span><Check size={14} />Three roles. One connected campus.</span></section>
      </div>
    </div>
  </>
}
