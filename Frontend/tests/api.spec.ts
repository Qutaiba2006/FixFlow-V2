import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { base, accounts, login, owner, report, headers } from './helpers'

test('registration validates input, normalizes email, rejects duplicates and ignores requested staff role', async ({ request }) => {
  const user = await owner(request)
  const body = { name: 'Student', email: user.email.toUpperCase(), password: user.password }
  expect((await request.post(`${base}/auth/register`, { data: body })).status()).toBe(409)
  for (const invalid of [{ ...body, email: 'invalid' }, { ...body, password: 'short' }, { ...body, name: '  ' }, {}]) {
    expect((await request.post(`${base}/auth/register`, { data: invalid })).status()).toBe(400)
  }
  const me = await request.get(`${base}/auth/me`, { headers: headers(user.token) })
  expect((await me.json()).user).toMatchObject({ email: user.email, role: 'student' })
})

test('all staff logins, invalid credentials, malformed and genuinely expired JWTs', async ({ request }) => {
  for (const role of ['student', 'technician', 'admin', 'technician2']) {
    const session = await login(request, role)
    expect(session.user.role).toBe(role === 'technician2' ? 'technician' : role)
    expect((await request.get(`${base}/auth/me`, { headers: headers(session.token) })).status()).toBe(200)
  }
  const local = await accounts()
  expect((await request.post(`${base}/auth/login`, { data: { email: local.users.student, password: 'incorrect-test-password' } })).status()).toBe(401)
  expect((await request.post(`${base}/auth/login`, { data: {} })).status()).toBe(400)
  const expired = JSON.parse(await readFile('.local/expired-session.json', 'utf8'))
  for (const authorization of ['Bearer invalid', 'Basic invalid', `Bearer ${expired.token}`, 'Bearer ']) {
    expect((await request.get(`${base}/reports`, { headers: { Authorization: authorization } })).status()).toBe(401)
  }
})

test('protected endpoints enforce roles before returning data', async ({ request }) => {
  const student = await login(request, 'student')
  const technician = await login(request, 'technician')
  for (const endpoint of ['/reports', '/locations', '/auth/me', '/analytics/summary', '/users/technicians']) expect((await request.get(`${base}${endpoint}`)).status()).toBe(401)
  for (const endpoint of ['/analytics/summary', '/users/technicians', '/auth/admin', '/reports/assigned']) expect((await request.get(`${base}${endpoint}`, { headers: headers(student.token) })).status()).toBe(403)
  expect((await request.get(`${base}/analytics/summary`, { headers: headers(technician.token) })).status()).toBe(403)
  expect((await request.post(`${base}/locations`, { headers: headers(student.token), data: { name: 'Unauthorized location' } })).status()).toBe(403)
})

test('report creation, populated retrieval, mine, validation and missing records', async ({ request }) => {
  const user = await owner(request)
  const created = await report(request, user.token)
  expect(created).toMatchObject({ status: 'open', priorityScore: 0, reportedBy: user.user.id, images: [] })
  expect(created.timeline).toHaveLength(1)
  const detail = await (await request.get(`${base}/reports/${created._id}`, { headers: headers(user.token) })).json()
  expect(detail.report.location.name).toBeTruthy()
  expect((await (await request.get(`${base}/reports/mine`, { headers: headers(user.token) })).json()).map((r: { _id: string }) => r._id)).toEqual([created._id])
  expect((await request.post(`${base}/reports`, { headers: headers(user.token), data: { title: 'bad', description: 'short' } })).status()).toBe(400)
  expect((await request.get(`${base}/reports/invalid`, { headers: headers(user.token) })).status()).toBe(400)
  expect((await request.get(`${base}/reports/000000000000000000000000`, { headers: headers(user.token) })).status()).toBe(404)
  expect((await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })).status()).toBe(200)
})

test('owners edit and delete open reports; other users cannot', async ({ request }) => {
  const user = await owner(request)
  const other = await login(request, 'student')
  const created = await report(request, user.token)
  const patch = { title: 'Updated report title', description: 'Updated description persisted in the actual database.' }
  expect((await request.patch(`${base}/reports/${created._id}`, { headers: headers(other.token), data: patch })).status()).toBe(403)
  expect((await request.delete(`${base}/reports/${created._id}`, { headers: headers(other.token) })).status()).toBe(403)
  const edited = await request.patch(`${base}/reports/${created._id}`, { headers: headers(user.token), data: patch })
  expect(edited.status()).toBe(200); expect((await edited.json()).report.title).toBe(patch.title)
  expect((await request.patch(`${base}/reports/${created._id}`, { headers: headers(user.token), data: { title: 'bad', description: '' } })).status()).toBe(400)
  expect((await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })).status()).toBe(200)
  expect((await request.get(`${base}/reports/${created._id}`, { headers: headers(user.token) })).status()).toBe(404)
})

test('support and affected toggles persist exact scores across users and sort by priority', async ({ request }) => {
  const user = await owner(request)
  const other = await login(request, 'student')
  const created = await report(request, user.token)
  for (const [token, action, score] of [[user.token, 'support', 2], [user.token, 'affected', 7], [other.token, 'support', 9], [other.token, 'affected', 14], [user.token, 'support', 12], [user.token, 'affected', 7]] as const) {
    const response = await request.patch(`${base}/reports/${created._id}/${action}`, { headers: headers(token) })
    expect(response.status()).toBe(200); expect((await response.json()).priorityScore).toBe(score)
  }
  const list = await (await request.get(`${base}/reports`, { headers: headers(user.token) })).json()
  const stored = list.find((r: { _id: string }) => r._id === created._id)
  expect(stored.priorityScore).toBe(stored.supporters.length * 2 + stored.affectedUsers.length * 5)
  const scores = list.map((r: { priorityScore: number }) => r.priorityScore)
  expect(scores).toEqual([...scores].sort((a, b) => b - a))
  await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })
})

test('assignment, reassignment and authorization follow current technician', async ({ request }) => {
  const user = await owner(request)
  const admin = await login(request, 'admin')
  const tech = await login(request, 'technician')
  const second = await login(request, 'technician2')
  const created = await report(request, user.token)
  const url = `${base}/reports/${created._id}`
  expect((await request.patch(`${url}/assign`, { headers: headers(user.token), data: { technicianId: tech.user.id } })).status()).toBe(403)
  for (const technicianId of ['invalid', user.user.id]) expect((await request.patch(`${url}/assign`, { headers: headers(admin.token), data: { technicianId } })).status()).toBe(400)
  for (const technicianId of [tech.user.id, second.user.id]) expect((await request.patch(`${url}/assign`, { headers: headers(admin.token), data: { technicianId } })).status()).toBe(200)
  const assigned = await (await request.get(`${base}/reports/assigned`, { headers: headers(second.token) })).json()
  expect(assigned.some((r: { _id: string }) => r._id === created._id)).toBe(true)
  expect((await request.patch(`${url}/status`, { headers: headers(tech.token), data: { status: 'resolved' } })).status()).toBe(403)
  expect((await request.patch(`${url}/status`, { headers: headers(second.token), data: { status: 'in_progress' } })).status()).toBe(200)
  expect((await request.patch(`${url}/status`, { headers: headers(admin.token), data: { status: 'open' } })).status()).toBe(200)
  await request.delete(url, { headers: headers(user.token) })
})

test('status transitions, no-op updates, timeline attribution and edit/delete conflicts', async ({ request }) => {
  const user = await owner(request)
  const admin = await login(request, 'admin')
  const tech = await login(request, 'technician')
  const created = await report(request, user.token)
  const url = `${base}/reports/${created._id}`
  expect((await request.patch(`${url}/status`, { headers: headers(tech.token), data: { status: 'resolved' } })).status()).toBe(403)
  expect((await request.patch(`${url}/status`, { headers: headers(user.token), data: { status: 'resolved' } })).status()).toBe(403)
  expect((await request.patch(`${url}/status`, { headers: headers(admin.token), data: { status: 'unknown' } })).status()).toBe(400)
  await request.patch(`${url}/assign`, { headers: headers(admin.token), data: { technicianId: tech.user.id } })
  for (const status of ['in_progress', 'resolved', 'resolved']) expect((await request.patch(`${url}/status`, { headers: headers(tech.token), data: { status } })).status()).toBe(200)
  expect((await request.patch(url, { headers: headers(user.token), data: { title: 'Locked report title', description: 'Changes must fail on a resolved report.' } })).status()).toBe(409)
  expect((await request.delete(url, { headers: headers(user.token) })).status()).toBe(409)
  const detail = (await (await request.get(url, { headers: headers(user.token) })).json()).report
  expect(detail.timeline.map((e: { action: string }) => e.action)).toEqual(['created', 'assigned', 'status_changed', 'status_changed'])
  expect(detail.timeline.map((e: { performedBy: string }) => e.performedBy)).toEqual([user.user.id, admin.user.id, tech.user.id, tech.user.id])
  expect(detail.timeline.every((e: { at: string }) => Number.isFinite(Date.parse(e.at)))).toBe(true)
  await request.patch(`${url}/status`, { headers: headers(admin.token), data: { status: 'open' } })
  await request.delete(url, { headers: headers(user.token) })
})

test('analytics matches actual report counts and reflects a complete workflow', async ({ request }) => {
  const user = await owner(request)
  const admin = await login(request, 'admin')
  const tech = await login(request, 'technician')
  const summary = async () => (await (await request.get(`${base}/analytics/summary`, { headers: headers(admin.token) })).json())
  const before = await summary()
  const created = await report(request, user.token)
  await request.patch(`${base}/reports/${created._id}/assign`, { headers: headers(admin.token), data: { technicianId: tech.user.id } })
  for (const status of ['in_progress', 'resolved']) await request.patch(`${base}/reports/${created._id}/status`, { headers: headers(tech.token), data: { status } })
  const after = await summary()
  expect(after).toEqual({ ...before, totalReports: before.totalReports + 1, resolvedReports: before.resolvedReports + 1 })
  const all = await (await request.get(`${base}/reports`, { headers: headers(admin.token) })).json()
  expect(after).toEqual({ totalReports: all.length, openReports: all.filter((r: { status: string }) => r.status === 'open').length, inProgressReports: all.filter((r: { status: string }) => r.status === 'in_progress').length, resolvedReports: all.filter((r: { status: string }) => r.status === 'resolved').length })
  await request.patch(`${base}/reports/${created._id}/status`, { headers: headers(admin.token), data: { status: 'open' } })
  await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })
})

test('admin creates locations, rejects invalid input and duplicates', async ({ request }) => {
  const admin = await login(request, 'admin')
  const data = { name: `Verification Location ${crypto.randomUUID().slice(0, 8)}`, buildingCode: 'VT', floor: 'L1' }
  const created = await request.post(`${base}/locations`, { headers: headers(admin.token), data })
  expect(created.status()).toBe(201)
  expect((await request.post(`${base}/locations`, { headers: headers(admin.token), data })).status()).toBe(409)
  expect((await request.post(`${base}/locations`, { headers: headers(admin.token), data: { name: 'Invalid', floor: 2 } })).status()).toBe(400)
  const locations = await (await request.get(`${base}/locations`, { headers: headers(admin.token) })).json()
  expect(locations.some((l: { name: string }) => l.name === data.name)).toBe(true)
})

test('isolated photo service returns an explicit failure and leaves report saved', async ({ request }) => {
  const user = await owner(request)
  const created = await report(request, user.token)
  const response = await request.post(`${base}/reports/${created._id}/images`, { headers: headers(user.token), multipart: { images: { name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('test-image') } } })
  expect(response.status()).toBe(503)
  expect((await (await request.get(`${base}/reports/${created._id}`, { headers: headers(user.token) })).json()).report.images).toEqual([])
  expect((await request.post(`${base}/reports/${created._id}/images`)).status()).toBe(401)
  await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })
})
