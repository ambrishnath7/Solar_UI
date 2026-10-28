import { expect, test, type Page } from '@playwright/test'

// Signed-in admin flows through the developer sign-in. Runs only when the local API serves /dev/users
// (Development + DevAuth + local database) and the web app was started with VITE_DEV_LOGIN=true.
const API = process.env.E2E_API_URL ?? 'http://localhost:5000'
const ADMIN = process.env.E2E_DEV_ADMIN_EMAIL ?? 'admin@local'

let devAvailable = false
test.beforeAll(async ({ request }) => {
  try { devAvailable = (await request.get(`${API}/dev/users?role=admin`, { timeout: 5000 })).ok() } catch { devAvailable = false }
})

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: `Sign in as ${ADMIN}` }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 })
}

test.describe('admin via dev login', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!devAvailable, `dev login not available at ${API}`)
    await signIn(page)
  })

  test('dashboard shows the summary cards', async ({ page }) => {
    await expect(page.getByText('Visits this month')).toBeVisible()
    await expect(page.getByText('dev login', { exact: true }).first()).toBeVisible()
  })

  test('client: create, then edit with empty optional fields and save', async ({ page }) => {
    const name = `E2E Client ${Date.now()}`
    await page.getByRole('link', { name: 'Clients' }).click()
    await page.getByRole('button', { name: 'New client' }).click()
    await page.getByLabel('Client name *').fill(name)
    await page.getByRole('button', { name: 'Create client' }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 })
    // Audit finding: editing a client whose optional fields are null used to fail silently.
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Client name *').fill(`${name} edited`)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: `${name} edited` })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible()
  })

  test('reports: list, open detail, PDF preview renders', async ({ page }) => {
    await page.getByRole('link', { name: 'Reports' }).click()
    const row = page.locator('tbody tr').filter({ hasText: /PMC-\d{4}-\d{4}/ }).first()
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click()
    await expect(page.getByText('PDF preview')).toBeVisible()
    await expect(page.locator('iframe[title="Report PDF"]')).toBeVisible({ timeout: 30_000 })
  })

  test('AMC, calendar, defects and settings pages load', async ({ page }) => {
    for (const [link, heading] of [['AMC', 'AMC management'], ['Calendar', 'Maintenance calendar'], ['Defect Summary', 'Defect summary'], ['Settings', 'Settings']] as const) {
      await page.getByRole('link', { name: link, exact: true }).click()
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 15_000 })
      await expect(page.locator('text=/Server error|Request failed/')).toHaveCount(0)
    }
  })

  test('sign out returns to login and protects pages', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/reports')
    await expect(page).toHaveURL(/\/login/)
  })
})
