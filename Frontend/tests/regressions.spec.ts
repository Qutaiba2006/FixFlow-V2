import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { base, headers, login, owner, report, signIn, signInRole } from './helpers'

test('analytics export includes every location while chart displays the top seven', async ({ page, request }) => {
  const admin = await login(request, 'admin')
  const user = await owner(request)
  const records: string[] = []
  for (let i = 0; i < 8; i++) {
    const locationResponse = await request.post(`${base}/locations`, { headers: headers(admin.token), data: { name: `Export ${crypto.randomUUID().slice(0, 8)} ${i}` } })
    expect(locationResponse.status()).toBe(201)
    const created = await request.post(`${base}/reports`, { headers: headers(user.token), data: { title: `Export location report ${i}`, description: 'A real database record to verify that all location groups are exported.', location: (await locationResponse.json()).location._id } })
    expect(created.status()).toBe(201); records.push((await created.json()).report._id)
  }
  await signInRole(page, 'admin'); await page.goto('/analytics')
  await expect(page.locator('.bar-row')).toHaveCount(7)
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export summary' }).click()
  const file = (await (await pending).path())!
  const exported = JSON.parse(await readFile(file, 'utf8'))
  const reports = await (await request.get(`${base}/reports`, { headers: headers(admin.token) })).json()
  const expected: Record<string, number> = {}
  for (const item of reports) expected[item.location.name] = (expected[item.location.name] || 0) + 1
  expect(Object.keys(exported.reportsByLocation).length).toBeGreaterThanOrEqual(8)
  expect(exported.reportsByLocation).toEqual(expected)
  expect(Object.values(exported.reportsByLocation).reduce((sum: number, n) => sum + Number(n), 0)).toBe(exported.summary.totalReports)
  for (const id of records) await request.delete(`${base}/reports/${id}`, { headers: headers(user.token) })
})

test('failed interactions retain database score and retry uses the real backend', async ({ page, request }) => {
  const user = await owner(request)
  const created = await report(request, user.token)
  await signIn(page, user.email, user.password); await page.goto(`/reports/${created._id}`)
  const support = page.getByRole('button', { name: /^Support / })
  await expect(support).toHaveAttribute('aria-pressed', 'false')
  await page.context().setOffline(true); await support.click()
  await expect(page.getByRole('alert')).toContainText('Cannot reach the API')
  await expect(support).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.priority-panel > strong')).toHaveText('0points')
  const stored = await (await request.get(`${base}/reports/${created._id}`, { headers: headers(user.token) })).json()
  expect(stored.report.priorityScore).toBe(0)
  await page.context().setOffline(false); await support.click()
  await expect(support).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.priority-panel > strong')).toHaveText('2points')
  await page.reload(); await expect(support).toHaveAttribute('aria-pressed', 'true')
  await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })
})

test('student cannot edit another report or access management controls through direct navigation', async ({ page, request }) => {
  const user = await owner(request)
  const created = await report(request, user.token)
  await signInRole(page, 'student'); await page.goto(`/reports/${created._id}`)
  await expect(page.getByRole('heading', { name: created.title, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit report', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Delete report', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Technician', exact: true })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Report status', exact: true })).toHaveCount(0)
  await page.goto('/administration'); await expect(page).toHaveURL(/feed/)
  await page.goto('/locations'); await expect(page.getByRole('button', { name: 'Add a location' })).toHaveCount(0)
  await request.delete(`${base}/reports/${created._id}`, { headers: headers(user.token) })
})
