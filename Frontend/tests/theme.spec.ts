import { test, expect } from '@playwright/test'
import { owner, signIn, navigate } from './helpers'

test('theme bootstrap works before React loads and follows the system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.route('**/*', route => route.request().resourceType() === 'script' ? route.abort() : route.continue())
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(16, 27, 23)')
  expect(await page.locator('#root').innerHTML()).toBe('')
  await page.evaluate(() => localStorage.setItem('fixflow-experiment-theme', 'light'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('theme preferences sync across tabs and return to system mode', async ({ page, context, request }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await page.getByRole('switch', { name: 'Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  const other = await context.newPage(); await other.goto('/login')
  await other.getByRole('switch', { name: 'Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await other.close()
  const user = await owner(request)
  await signIn(page, user.email, user.password)
  await navigate(page, 'Workspace settings')
  await page.getByRole('button', { name: 'System', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('fixflow-experiment-theme'))).toBeNull()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('theme controls work when localStorage is blocked', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage unavailable', 'SecurityError') } }))
  await page.goto('/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('switch', { name: 'Dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
