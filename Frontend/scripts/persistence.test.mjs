import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = 'http://127.0.0.1:5001/api'
const marker = createHash('sha256').update(root).digest('hex').slice(0, 16)
test('MongoDB records, timelines, interactions and JWT sessions survive API and database restart', { timeout: 90000 }, async () => {
  for (const port of [5001, 27029]) await new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', () => reject(new Error(`Port ${port} is occupied; no existing server will be used.`)))
    probe.listen(port, '127.0.0.1', () => probe.close(resolve))
  })
  await mkdir(path.join(root, '.local'), { recursive: true })
  const logs = createWriteStream(path.join(root, '.local/persistence.log'))
  let child
  async function stop() {
    if (!child || child.exitCode !== null) return
    const done = new Promise(resolve => child.once('exit', resolve))
    child.send({ type: 'shutdown' })
    const timer = setTimeout(() => child.kill(), 10000)
    await done; clearTimeout(timer)
    // Wait for the owned database socket to close before a new instance binds it.
    for (let attempt = 0; attempt < 50; attempt++) {
      const closed = await new Promise(resolve => { const socket = net.connect(27029, '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(false) }); socket.once('error', () => resolve(true)) })
      if (closed) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('Owned MongoDB did not stop')
  }
  async function start() {
    child = spawn(process.execPath, [path.join(root, 'scripts/local-api.mjs')], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
    child.stdout.pipe(logs, { end: false }); child.stderr.pipe(logs, { end: false })
    for (let begin = Date.now(); Date.now() - begin < 35000 && child.exitCode === null;) {
      try {
        const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(500) })
        if (response.ok && response.headers.get('X-FixFlow-Experiment') === marker && response.headers.get('X-FixFlow-Database') === 'fixflow_frontend_experiment') return
      } catch { /* Readiness only; no credentials are sent until identity is verified. */ }
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    throw new Error('Local API failed to start; see .local/persistence.log')
  }
  async function api(endpoint, method = 'GET', body, token) {
    const response = await fetch(`${base}${endpoint}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) })
    assert.equal(response.headers.get('X-FixFlow-Experiment'), marker)
    assert.equal(response.ok, true, `Unexpected HTTP ${response.status} for ${endpoint}`)
    return response.json()
  }
  try {
    await start()
    const local = JSON.parse(await readFile(path.join(root, '.local/test-accounts.json'), 'utf8'))
    const sessions = {}
    for (const role of ['student', 'admin', 'technician']) sessions[role] = await api('/auth/login', 'POST', { email: local.users[role], password: local.password })
    const places = await api('/locations', 'GET', undefined, sessions.student.token)
    const created = await api('/reports', 'POST', { title: `Restart verification ${randomUUID()}`, description: 'Verify durable writes through the original backend after restarting both API and MongoDB.', location: places[0]._id }, sessions.student.token)
    const url = `/reports/${created.report._id}`
    await api(`${url}/support`, 'PATCH', undefined, sessions.student.token)
    await api(`${url}/affected`, 'PATCH', undefined, sessions.student.token)
    await api(`${url}/assign`, 'PATCH', { technicianId: sessions.technician.user.id }, sessions.admin.token)
    await api(`${url}/status`, 'PATCH', { status: 'resolved' }, sessions.technician.token)
    const before = (await api(url, 'GET', undefined, sessions.student.token)).report
    const analytics = await api('/analytics/summary', 'GET', undefined, sessions.admin.token)
    await stop(); await start()
    assert.deepEqual((await api('/auth/me', 'GET', undefined, sessions.student.token)).user, sessions.student.user)
    assert.deepEqual((await api(url, 'GET', undefined, sessions.student.token)).report, before)
    assert.equal(before.priorityScore, 7)
    assert.equal(before.timeline.length, 3)
    assert.deepEqual(await api('/analytics/summary', 'GET', undefined, sessions.admin.token), analytics)
    await api(`${url}/status`, 'PATCH', { status: 'open' }, sessions.admin.token)
    await api(url, 'DELETE', undefined, sessions.student.token)
  } finally { await stop(); logs.end() }
})
