import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'
const KEY = 'fixflow-experiment-theme'
const EVENT = 'fixflow-theme-changed'

function apply(preference: ThemePreference) {
  const theme: Theme = preference === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : preference
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.themePreference = preference
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101b17' : '#f8f9f5')
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, preference)
  } catch { /* Keep the in-memory choice usable when storage is blocked. */ }
  apply(preference)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(listener: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const syncSystem = () => {
    if (document.documentElement.dataset.themePreference === 'system') apply('system')
    listener()
  }
  const syncStorage = (event: StorageEvent) => {
    if (event.key !== KEY && event.key !== null) return
    apply(event.newValue === 'dark' || event.newValue === 'light' ? event.newValue : 'system')
    listener()
  }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', syncStorage)
  media.addEventListener('change', syncSystem)
  // A system change can occur between the head script and React subscribing.
  syncSystem()
  return () => {
    window.removeEventListener(EVENT, listener)
    window.removeEventListener('storage', syncStorage)
    media.removeEventListener('change', syncSystem)
  }
}
const snapshot = () => `${document.documentElement.dataset.themePreference}:${document.documentElement.dataset.theme}`

export function useTheme() {
  const value = useSyncExternalStore(subscribe, snapshot)
  const [preference, theme] = value.split(':') as [ThemePreference, Theme]
  return { preference, theme, setPreference: setThemePreference, toggle: () => setThemePreference(theme === 'dark' ? 'light' : 'dark') }
}
