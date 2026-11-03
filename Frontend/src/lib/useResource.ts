import { useEffect, useState } from 'react'
import { useApp } from './context'
export function useResource<T>(path: string) {
  const { api, revision } = useApp()
  const [state, setState] = useState<{ data: T | null; error: string; path: string; revision: number; source: typeof api } | null>(null)
  useEffect(() => {
    let active = true
    api<T>(path).then(data => { if (active) setState({ data, error: '', path, revision, source: api }) }).catch(err => { if (active) setState({ data: null, error: err.message, path, revision, source: api }) })
    return () => { active = false }
  }, [path, api, revision])
  const current = state?.path === path && state?.source === api
  return { data: current ? state.data : null, error: current ? state.error : '', loading: !current || state?.revision !== revision }
}
