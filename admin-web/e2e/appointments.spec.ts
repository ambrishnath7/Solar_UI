import { expect, test } from '@playwright/test'
import path from 'node:path'

// Admin assigns a visit from the calendar, sees it on the day, edits it, and cancels it (leaves nothing scheduled behind).
// Uses the developer sign-in, so it runs only against a local API in Development (E2E_API_URL, default http://localhost:5000).
const API = process.env.E2E_API_URL ?? 'http://localhost:5000'
const ADMIN = process.env.E2E_DEV_ADMIN_EMAIL ?? 'admin@local'
const DIR = process.env.E2E_SCREENSHOTS_DIR ?? path.join('e2e', 'results', 'tour')

let devAvailable = false
test.beforeAll(async ({ request }) => {
  try { devAvailable = (await request.get(`${API}/dev/users?role=admin`, { timeout: 5000 })).ok() } catch { devAvailable = false }
})
test.use({ viewport: { width: 1366, height: 860 } })

test('assign, edit and cancel a visit from the calendar', async ({ page, request }) => {
  test.skip(!devAvailable, `dev login not available at ${API}`)
  test.setTimeout(120_000)
  await page.goto('/login')
  await page.getByRole('button', { name: `Sign in as ${ADMIN}` }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 20_000 })

  // pick a client and an engineer that exist
  const users = await (await request.get(`${API}/dev/users?role=admin`)).json() as { userId: string; email?: string }[]
  const { accessToken } = await (await request.post(`${API}/dev/login`, { data: { userId: (users.find(u => u.email === ADMIN) ?? users[0]).userId } })).json() as { accessToken: string }
  const auth = { Authorization: `Bearer ${accessToken}` }
  const client = (await (await request.get(`${API}/clients?active=true&pageSize=1&sort=name`, { headers: auth })).json() as { items: { id: string; name: string }[] }).items[0]
  const engineer = (await (await request.get(`${API}/engineers?active=true`, { headers: auth })).json() as { id: string; name: string }[])[0]
  // a day in next month with no open visit for that client (keeps the test repeatable)
  const d = new Date(); const day = new Date(d.getFullYear(), d.getMonth() + 1, 10 + Math.floor(Math.random() * 15))
  const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`

  await page.getByRole('link', { name: 'Calendar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Maintenance calendar' })).toBeVisible()
  await page.getByRole('button', { name: 'Next month' }).click()
  await page.getByRole('button', { name: `Assign a visit on ${day.getDate()} `, exact: false }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Schedule a visit' })).toBeVisible()
  await dialog.getByLabel('Client', { exact: true }).selectOption(client.id)
  await dialog.getByLabel('Engineer', { exact: true }).selectOption(engineer.id)
  await expect(dialog.locator('input[type=date]')).toHaveValue(iso)
  await dialog.locator('input[type=time]').fill('10:30')
  await dialog.getByRole('textbox').last().fill('E2E: call the client before coming')
  await page.screenshot({ path: path.join(DIR, '21-calendar-assign-visit.png') })
  await dialog.getByRole('button', { name: 'Assign visit' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })

  const chip = page.getByRole('button', { name: new RegExp(`10:30 ${client.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
  await expect(chip).toBeVisible({ timeout: 15_000 })
  await expect(chip).toContainText(engineer.name)
  await page.screenshot({ path: path.join(DIR, '22-calendar-with-visit.png'), fullPage: true })

  // edit: move the time
  await chip.click()
  await expect(dialog.getByRole('heading', { name: 'Edit visit' })).toBeVisible()
  await dialog.locator('input[type=time]').fill('14:00')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  const moved = page.getByRole('button', { name: new RegExp(`14:00 ${client.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
  await expect(moved).toBeVisible({ timeout: 15_000 })

  // assigning the same client on the same day again is refused with a clear message
  await page.getByRole('button', { name: `Assign a visit on ${day.getDate()} `, exact: false }).click()
  await dialog.getByLabel('Client', { exact: true }).selectOption(client.id)
  await dialog.getByLabel('Engineer', { exact: true }).selectOption(engineer.id)
  await dialog.getByRole('button', { name: 'Assign visit' }).click()
  await expect(dialog.getByText(/already has a visit/)).toBeVisible({ timeout: 15_000 })
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()

  // cancel it
  await moved.click()
  await dialog.getByRole('button', { name: 'Cancel visit' }).click()
  await dialog.getByRole('button', { name: 'Yes, cancel visit' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 15_000 })
  await expect(moved).toHaveCount(0)
})
