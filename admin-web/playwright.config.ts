import { defineConfig } from '@playwright/test'

// Expects the admin web dev server on :5173 and the API on :5182 (see README). Authenticated tests need
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for a Supabase user that is an admin in the API's database.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173', headless: true, screenshot: 'only-on-failure' },
  reporter: [['list']],
  outputDir: 'e2e/results',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
