import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function health() {
  try { return await fetch('http://localhost:5001/api/health', { signal: AbortSignal.timeout(500) }) }
  catch { return null }
}
if (await health()) throw new Error('Stop the existing experiment API before testing startup. No running process was stopped.')
const child = spawn(process.execPath, [path.join(root, 'scripts/dev-connected.mjs')], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
let output = ''
child.stdout.on('data', value => { output += value })
child.stderr.on('data', value => { output += value })
const exited = new Promise(resolve => child.once('exit', resolve))
try {
  let ready = false
  const deadline = Date.now() + 40000
  while (Date.now() < deadline && child.exitCode === null) {
    const response = await health()
    if (response?.ok && response.headers.get('X-FixFlow-Database') === 'fixflow_frontend_experiment') {
      try {
        const html = await fetch('http://localhost:5173', { signal: AbortSignal.timeout(1000) }).then(response => response.text())
        if (html.includes('name="fixflow-workspace" content="fixflow"')) { ready = true; break }
      } catch { /* Vite may still be starting. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error(`The connected app did not become ready.\n${output}`)
  console.log('Connected startup passed: isolated MongoDB, verified API, and FixFlow frontend are reachable.')
} finally {
  if (child.connected) child.send({ type: 'shutdown' })
  const timer = setTimeout(() => child.kill(), 10000)
  await exited
  clearTimeout(timer)
}
if (await health()) throw new Error('The API did not stop after the connected runner shut down.')
console.log('Connected shutdown passed: owned frontend, API and MongoDB processes stopped.')
