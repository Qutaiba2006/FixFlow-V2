import { expect } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

export const base = 'http://localhost:5001/api'
export const accounts = async () => JSON.parse(await readFile('.local/test-accounts.json', 'utf8'))
export async function login(request: APIRequestContext, role: string) {
  const local = await accounts()
  const response = await request.post(`${base}/auth/login`, { data: { email: local.users[role], password: local.password } })
  expect(response.status()).toBe(200)
  return response.json()
}
export const headers = (token: string) => ({ Authorization: `Bearer ${token}` })
export async function owner(request: APIRequestContext) {
  const local = await accounts()
  const email = `verification-${crypto.randomUUID()}@example.test`
  const response = await request.post(`${base}/auth/register`, { data: { name: 'Verification Student', email, password: local.password, role: 'admin' } })
  expect(response.status()).toBe(201)
  expect((await response.json()).user.role).toBe('student')
  const signed = await request.post(`${base}/auth/login`, { data: { email, password: local.password } })
  expect(signed.status()).toBe(200)
  return { ...await signed.json(), email, password: local.password }
}
export async function report(request: APIRequestContext, token: string, title = `Verification report ${crypto.randomUUID().slice(0, 8)}`) {
  const places = await request.get(`${base}/locations`, { headers: headers(token) })
  expect(places.status()).toBe(200)
  const response = await request.post(`${base}/reports`, { headers: headers(token), data: { title, description: 'A real report created by automated verification in the isolated MongoDB database.', location: (await places.json())[0]._id } })
  expect(response.status()).toBe(201)
  return (await response.json()).report
}
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in to your workspace' }).click()
  await expect(page).toHaveURL(/\/feed$/)
  await expect(page.locator('.report-list, .empty').first()).toBeVisible()
}
export async function signInRole(page: Page, role: string) {
  const local = await accounts()
  await signIn(page, local.users[role], local.password)
}
export async function navigate(page: Page, label: string) {
  const opener = page.getByRole('button', { name: 'Open navigation', exact: true })
  if (await opener.isVisible()) await opener.click()
  await page.getByRole('link', { name: label, exact: true }).click()
}
