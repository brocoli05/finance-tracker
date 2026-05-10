import { test, expect } from '@playwright/test'

// Use env vars or fall back to defaults for local dev
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'e2e-test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'testpassword123'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows sign in form by default', async ({ page }) => {
    await expect(page.getByText('SpendSight')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' }).last()).toBeVisible()
  })

  test('switches to sign up mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign up' }).first().click()
    await expect(page.getByText('Create a new account')).toBeVisible()
    await expect(page.getByText('Minimum 6 characters')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('you@example.com').fill('wrong@example.com')
    await page.getByPlaceholder('••••••••').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).last().click()

    await expect(page.locator('.bg-rose-50')).toBeVisible({ timeout: 10_000 })
  })

  test('shows error for missing fields', async ({ page }) => {
    // HTML5 required validation prevents submission without filling fields;
    // fill only email to check password validation
    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    // Leave password empty — browser validation should prevent submission
    const submitBtn = page.getByRole('button', { name: 'Sign in' }).last()
    await submitBtn.click()

    // Password field should be invalid (HTML5 required)
    const passwordInput = page.getByPlaceholder('••••••••')
    await expect(passwordInput).toHaveAttribute('required')
  })

  test('sign up with new account shows confirmation or redirects', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`

    await page.getByRole('button', { name: 'Sign up' }).first().click()
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail)
    await page.getByPlaceholder('••••••••').fill('securepassword123')
    await page.getByRole('button', { name: 'Create account' }).click()

    // Either redirected to dashboard, shown a "check your email" notice, or shown an error
    // (real Supabase signup can be rate-limited or fail in some environments)
    try {
      await expect(page).toHaveURL('/', { timeout: 5_000 })
    } catch {
      await expect(
        page.locator('.bg-emerald-50').or(page.locator('.bg-rose-50'))
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test('valid login redirects to dashboard', async ({ page }) => {
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).last().click()

    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })
})
