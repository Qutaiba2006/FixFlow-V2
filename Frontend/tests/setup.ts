import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'

export default async function setup() {
  // Fail closed before contacting any API or reading local test accounts.
  for (const port of [5001, 5173, 27029]) await new Promise<void>((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', () => reject(new Error(`Test port ${port} is occupied. Stop the local workspace before npm test.`)))
    probe.listen(port, 'localhost', () => probe.close(() => resolve()))
  })
  await mkdir('.local', { recursive: true })
  const logs = createWriteStream('.local/test-servers.log', { flags: 'w' })
  const children: ChildProcess[] = []
  const stop = async () => {
    for (const child of children.reverse()) {
      if (child.exitCode !== null) continue
      const exited = new Promise(resolve => child.once('exit', resolve))
      if (child.connected) child.send({ type: 'shutdown' })
      else child.kill()
      const timer = setTimeout(() => child.kill(), 10000)
      await exited
      clearTimeout(timer)
    }
    logs.end()
  }
  try {
    for (const [script, url] of [['scripts/local-api.mjs', 'http://localhost:5001/api/health'], ['node_modules/vite/bin/vite.js', 'http://localhost:5173']]) {
      const child = spawn(process.execPath, [script], { cwd: path.resolve('.'), env: { ...process.env, VITE_API_BASE_URL: 'http://localhost:5001/api', VITE_REQUIRE_ISOLATED_API: 'true' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
      children.push(child)
      child.stdout?.pipe(logs, { end: false }); child.stderr?.pipe(logs, { end: false })
      let ready = false
      for (let start = Date.now(); Date.now() - start < 40000 && child.exitCode === null;) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
          if (response.ok) {
            if (url.includes('/api/')) {
              const marker = createHash('sha256').update(path.resolve('.')).digest('hex').slice(0, 16)
              if (response.headers.get('X-FixFlow-Experiment') !== marker || response.headers.get('X-FixFlow-Database') !== 'fixflow_frontend_experiment') throw new Error('Unexpected test API identity')
            }
            ready = true; break
          }
        } catch { /* Child logs preserve failures without printing credentials. */ }
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      if (!ready) throw new Error(`${script} failed to start; see .local/test-servers.log`)
    }
    return stop
  } catch (error) { await stop(); throw error }
}
