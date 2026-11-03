import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 30000,
  use: { baseURL: 'http://localhost:5173', channel: 'chrome', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/setup.ts',
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'chrome' } }],
})
