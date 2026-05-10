import { test, expect, type Page } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth.helper'

function futureDeadline(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

async function createGoal(page: Page, title: string, amount: string, category: string) {
  await page.getByRole('button', { name: 'Add Goal' }).click()
  const modalHeading = page.getByRole('heading', { name: 'Add Goal', level: 2 })
  await expect(modalHeading).toBeVisible()

  await page.getByPlaceholder('e.g. Emergency Fund').fill(title)
  await page.getByPlaceholder('0.00').fill(amount)
  await page.getByLabel('Deadline *').fill(futureDeadline())
  await page.getByLabel('Category to Cut *').selectOption(category)
  await page.getByRole('button', { name: 'Add Goal' }).last().click()

  await expect(modalHeading).not.toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(title)).toBeVisible()
}

// Find the goal card for a given title via its h3 heading, then go up to the
// card root (h3 → div.text → div.header-row → div.card-root = 3 levels up).
function goalCard(page: Page, title: string) {
  return page.getByRole('heading', { name: title, level: 3 }).locator('../../..')
}

test.describe('Goals', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/goals')
    await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible()
  })

  test('creates a new savings goal', async ({ page }) => {
    await createGoal(page, 'E2E Vacation Fund', '1000', 'Travel')
    // Goal card is visible in Active Goals section
    await expect(page.getByRole('heading', { name: 'E2E Vacation Fund', level: 3 })).toBeVisible()
    await expect(goalCard(page, 'E2E Vacation Fund').getByText('Travel')).toBeVisible()
  })

  test('adds progress toward a goal', async ({ page }) => {
    await createGoal(page, 'E2E Savings Progress', '500', 'Food')

    // Open Add Savings dialog from the goal card
    await goalCard(page, 'E2E Savings Progress')
      .getByRole('button', { name: '+ Add Savings' })
      .click()

    await expect(page.getByRole('heading', { name: 'Add Savings' })).toBeVisible()
    await expect(page.getByText('Adding toward:')).toBeVisible()

    // Enter an amount and submit
    await page.getByPlaceholder('0.00').fill('100')
    await page.getByRole('button', { name: 'Add Savings' }).last().click()

    // Dialog closes and goal card reflects the new saved amount ($100.00 / $500.00)
    await expect(page.getByRole('heading', { name: 'Add Savings' })).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('$100.00')).toBeVisible({ timeout: 5_000 })
  })

  test('shows congratulations banner when goal is reached', async ({ page }) => {
    // A $1 goal is fully achievable with a single $1 savings entry
    await createGoal(page, 'E2E Tiny Goal', '1', 'Hobbies')

    await goalCard(page, 'E2E Tiny Goal')
      .getByRole('button', { name: '+ Add Savings' })
      .click()

    await expect(page.getByRole('heading', { name: 'Add Savings' })).toBeVisible()
    await page.getByPlaceholder('0.00').fill('1')
    await page.getByRole('button', { name: 'Add Savings' }).last().click()

    // After refresh the goal moves to the "Achieved Goals" section
    await expect(page.getByRole('heading', { name: 'Add Savings' })).not.toBeVisible({ timeout: 10_000 })

    // Expand the Achieved Goals collapsible section
    await expect(page.getByText('Achieved Goals')).toBeVisible({ timeout: 10_000 })
    await page.getByText('Achieved Goals').click()

    // Congratulations banner is visible inside the achieved goal card
    await expect(
      page.getByText(/Goal achieved! You saved .* for E2E Tiny Goal\./)
    ).toBeVisible({ timeout: 5_000 })
  })

  test('deletes a goal with confirmation dialog', async ({ page }) => {
    await createGoal(page, 'E2E Goal To Delete', '200', 'Clothes')

    // Click the delete icon on the card
    await goalCard(page, 'E2E Goal To Delete').getByTitle('Delete').click()

    // Confirmation dialog — scope to avoid matching the goal card's heading
    const deleteDialog = page.locator('.max-w-sm')
    await expect(deleteDialog.getByText('Delete Goal')).toBeVisible()
    await expect(deleteDialog.getByText('E2E Goal To Delete', { exact: false })).toBeVisible()
    await expect(deleteDialog.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // Confirm
    await deleteDialog.getByRole('button', { name: 'Delete' }).click()

    // Goal is gone — toHaveCount(0) avoids strict-mode issues while both
    // the card heading and dialog span still exist during the delete request
    await expect(page.getByText('E2E Goal To Delete')).toHaveCount(0, { timeout: 10_000 })
  })
})
