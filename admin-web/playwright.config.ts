import { defineConfig } from '@playwright/test'

// Expects the admin web dev server on :3000 (started automatically) and, for signed-in tests, the API on :5000. Authenticated tests need
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for a Supabase user that is an admin in the API's database.
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', headless: true, screenshot: 'only-on-failure' },
  reporter: [['list']],
  outputDir: 'e2e/results',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
