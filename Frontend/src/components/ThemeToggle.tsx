import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? 'compact' : 'nav-utility'}`}
      role="switch"
      aria-label="Dark mode"
      aria-checked={theme === 'dark'}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onClick={toggle}
    >
      {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      {!compact && <><span>Dark mode</span><span className="theme-switch-track" aria-hidden="true"><i /></span></>}
    </button>
  )
}
