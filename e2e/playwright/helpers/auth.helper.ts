import { type Page, expect } from '@playwright/test'

export async function loginAsTestUser(page: Page): Promise<void> {
  const response = await page.request.post('/api/e2e/login')
  if (!response.ok()) {
    throw new Error(`E2E login failed (${response.status()}). Is E2E_TESTING=true set in .env.local?`)
  }
  await page.goto('/')
  await expect(page).toHaveURL('/', { timeout: 10_000 })
}
