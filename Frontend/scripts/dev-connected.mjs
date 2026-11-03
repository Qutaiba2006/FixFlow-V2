import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendAvailable = await new Promise(resolve => {
  const server = net.createServer()
  server.once('error', () => resolve(false))
  server.listen(5173, 'localhost', () => server.close(() => resolve(true)))
})
if (!frontendAvailable) {
  throw new Error('Port 5173 is already in use. Stop the existing frontend before starting the isolated workspace. No existing process was stopped.')
}
const api = spawn(process.execPath, [path.join(root, 'scripts/local-api.mjs')], { cwd: root, windowsHide: true, stdio: ['inherit', 'inherit', 'inherit', 'ipc'] })
let frontend
let stopping = false
let apiExited = false
let frontendReady = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  frontend?.kill()
  if (api.connected) api.send({ type: 'shutdown' })
  else if (!apiExited) api.kill()
  setTimeout(() => { if (!apiExited) api.kill() }, 5000).unref()
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
process.on('message', message => { if (message?.type === 'shutdown') stop() })
api.on('error', error => { console.error(error.message); stop(1) })
api.on('exit', code => { apiExited = true; if (!stopping) stop(code || 1); if (stopping && process.connected) process.disconnect() })
const deadline = Date.now() + 35000
while (!stopping && Date.now() < deadline) {
  try {
    const response = await fetch('http://127.0.0.1:5001/api/health', { signal: AbortSignal.timeout(1000) })
    if (response.ok && response.headers.get('X-FixFlow-Database') === 'fixflow_frontend_experiment') {
      console.log('Isolated MongoDB and API ready. Starting the frontend at http://localhost:5173')
      frontendReady = true
        frontend = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js')], { cwd: root, env: { ...process.env, VITE_API_BASE_URL: 'http://localhost:5001/api', VITE_REQUIRE_ISOLATED_API: 'true' }, windowsHide: true, stdio: 'inherit' })
        frontend.on('error', error => { console.error(error.message); stop(1) })
        frontend.on('exit', code => { if (!stopping) stop(code || 0) })
      break
    }
  } catch { /* MongoDB is still starting; the API process reports startup failures. */ }
  await new Promise(resolve => setTimeout(resolve, 200))
}
if (!frontendReady && !stopping) { console.error('The isolated API did not become ready in time.'); stop(1) }
