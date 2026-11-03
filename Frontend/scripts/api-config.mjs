export function validateApiConfiguration(env, production = false) {
  const value = env.VITE_API_BASE_URL || '/api'
  const isolated = env.VITE_REQUIRE_ISOLATED_API === 'true'
  if (production && isolated) throw new Error('Production builds cannot require the isolated test API.')
  if (value.startsWith('/') && !value.startsWith('//') && !/[?#\\\s]/.test(value)) return value
  let url
  try { url = new URL(value) } catch { throw new Error('VITE_API_BASE_URL must be a root-relative path or an absolute HTTP(S) API URL.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('VITE_API_BASE_URL must be an HTTP(S) URL without credentials, query or fragment.')
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.localhost') || url.hostname.startsWith('127.') || url.hostname === '0.0.0.0'
  if (production && (url.protocol !== 'https:' || local)) throw new Error('Production API URLs must use HTTPS and cannot point to localhost. Use /api for a same-origin proxy.')
  if (isolated && !local) throw new Error('Isolated API verification requires a loopback URL.')
  return value
}
