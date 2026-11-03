import type { User } from './types'

// A same-origin reverse proxy can serve /api in production. VITE_* values are public.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const isolated = import.meta.env.VITE_REQUIRE_ISOLATED_API === 'true'
const base = new URL(API_BASE, window.location.origin)
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
export interface Session { user: User; token: string }
export interface ApiConnection { message: string }

async function apiFetch(path: string, options?: RequestInit) {
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || (isolated && !loopback)) {
    throw new ApiError('The API URL is invalid for this environment.', 0)
  }
  try {
    return await fetch(`${API_BASE}${path}`, { ...options, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) })
  } catch { throw new ApiError('Cannot reach the API. Please check your connection and try again.', 0) }
}

function assertIsolated(response: Response) {
  if (isolated && (!/^[a-f0-9]{16}$/.test(response.headers.get('X-FixFlow-Experiment') || '') || response.headers.get('X-FixFlow-Database') !== 'fixflow_frontend_experiment')) {
    throw new ApiError('The configured API is not the isolated test workspace. Start npm run dev:connected.', 0)
  }
}

export async function verifyApi(): Promise<ApiConnection> {
  const response = await apiFetch('/health')
  assertIsolated(response)
  if (!response.ok) throw new ApiError('The API is not ready. Please try again.', response.status)
  const payload = await response.json().catch(() => null)
  if (typeof payload?.message !== 'string') throw new ApiError('The API returned an unexpected health response.', response.status)
  return payload
}

export async function request<T>(path: string, options: { method?: string; body?: unknown; session?: Session | null } = {}): Promise<T> {
  const { method = 'GET', body, session } = options
  // Only explicit local test mode requires harness identity before sending credentials.
  if (isolated) await verifyApi()
  const multipart = body instanceof FormData
  const response = await apiFetch(path, {
    method,
    headers: { ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
    body: body ? multipart ? body : JSON.stringify(body) : undefined,
  })
  assertIsolated(response)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && session) window.dispatchEvent(new Event('fixflow-session-expired'))
    throw new ApiError(response.status === 401 && !session ? 'Incorrect email or password.' : payload?.message || `The request failed (${response.status}). Please try again.`, response.status)
  }
  if (!payload) throw new ApiError('The API returned an unexpected response.', response.status)
  return payload as T
}
