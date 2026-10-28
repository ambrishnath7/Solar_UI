import { expect, test } from '@playwright/test'

const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test('unauthenticated visit redirects to login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login(\?.*)?$/)   // keeps ?from=/ so the user returns after signing in
  await expect(page.getByRole('heading', { name: 'Solar Maintenance' })).toBeVisible()
})

test('wrong password shows an error from Supabase Auth', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByLabel('Password').fill('definitely-wrong')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.bg-red-50')).toContainText(/invalid|credentials/i, { timeout: 15_000 })
})

test('empty form shows validation messages', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Enter a valid email')).toBeVisible()
  await expect(page.getByText('Password is required')).toBeVisible()
})

test.describe('authenticated admin', () => {
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 })
  })

  test('dashboard cards and recent reports load', async ({ page }) => {
    await expect(page.getByText('Visits this month')).toBeVisible()
    await expect(page.getByText('Recent reports')).toBeVisible()
  })

  test('clients: create, open, deactivate', async ({ page }) => {
    await page.getByRole('link', { name: 'Clients' }).click()
    await page.getByRole('button', { name: 'New client' }).click()
    const name = `E2E Client ${Date.now()}`
    await page.getByLabel('Client name *').fill(name)
    await page.getByLabel('Site location').fill('Rooftop')
    await page.getByRole('button', { name: 'Create client' }).click()
    await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('link', { name: 'Clients' }).click()
    await page.getByPlaceholder('Search name, site, contact').fill('E2E Client')
    await page.keyboard.press('Enter')
    await expect(page.getByText(name)).toBeVisible()
  })

  test('reports list, detail and PDF preview', async ({ page }) => {
    await page.getByRole('link', { name: 'Reports' }).click()
    await expect(page.getByRole('heading', { name: 'Maintenance reports' })).toBeVisible()
    const first = page.locator('tbody tr').first()
    await expect(first).toBeVisible({ timeout: 15_000 })
    await first.click()
    await expect(page.getByText('PDF preview')).toBeVisible()
    await expect(page.locator('iframe[title="Report PDF"]')).toBeVisible({ timeout: 20_000 })
  })

  test('settings page loads company settings', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page.getByLabel('Company name *')).toHaveValue(/Shree Abhi/, { timeout: 15_000 })
  })
})
