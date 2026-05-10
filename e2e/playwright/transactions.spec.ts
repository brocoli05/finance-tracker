import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth.helper'

async function openAddTransactionModal(page: Parameters<typeof loginAsTestUser>[0]) {
  await page.getByRole('button', { name: 'Add Transaction' }).click()
  await expect(page.getByRole('heading', { name: 'Add Transaction' })).toBeVisible()
}

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  })

  test('page loads and shows transactions or empty state', async ({ page }) => {
    await expect(
      page.getByText('No transactions yet.').or(page.locator('ul li').first())
    ).toBeVisible({ timeout: 10_000 })
  })

  test('adds a new expense transaction', async ({ page }) => {
    await openAddTransactionModal(page)

    // Scope to the modal form to avoid matching the filter-bar type buttons
    const form = page.locator('form')
    const expenseBtn = form.getByRole('button', { name: 'expense' })
    await expect(expenseBtn).toHaveClass(/bg-rose-500/)

    await page.getByPlaceholder('0.00').fill('42.50')
    await page.getByLabel('Category *').selectOption('Food')
    await page.getByPlaceholder('Add a note...').fill('Lunch at a café')
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()

    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 10_000 })
    // Scope to the list to avoid matching hidden <option> elements in selects
    await expect(page.locator('ul').getByText('Food').first()).toBeVisible()
    await expect(page.getByText('Lunch at a café')).toBeVisible()
  })

  test('adds a new income transaction', async ({ page }) => {
    await openAddTransactionModal(page)

    // Scope to the modal form to avoid matching the filter-bar type buttons
    const form = page.locator('form')
    await form.getByRole('button', { name: 'income' }).click()
    await expect(form.getByRole('button', { name: 'income' })).toHaveClass(/bg-emerald-500/)

    await page.getByPlaceholder('0.00').fill('3000')
    await page.getByLabel('Category *').selectOption('Payroll')
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()

    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 10_000 })
    await expect(page.locator('ul').getByText('Payroll').first()).toBeVisible()
  })

  test('shows validation error when category is missing', async ({ page }) => {
    await openAddTransactionModal(page)
    await page.getByPlaceholder('0.00').fill('50')
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()
    await expect(page.getByText('Please select a category.')).toBeVisible()
  })

  test('edits an existing transaction', async ({ page }) => {
    await openAddTransactionModal(page)
    await page.getByPlaceholder('0.00').fill('99.99')
    await page.getByLabel('Category *').selectOption('Clothes')
    await page.getByPlaceholder('Add a note...').fill('Original note')
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()
    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 10_000 })

    await page.getByTitle('Edit').first().click()
    await expect(page.getByText('Edit Transaction')).toBeVisible()

    const descriptionInput = page.getByPlaceholder('Add a note...')
    await descriptionInput.clear()
    await descriptionInput.fill('Updated note')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.getByText('Edit Transaction')).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Updated note')).toBeVisible()
  })

  test('deletes a transaction via the confirmation dialog', async ({ page }) => {
    // Create a transaction to delete
    await openAddTransactionModal(page)
    await page.getByPlaceholder('0.00').fill('15.00')
    await page.getByLabel('Category *').selectOption('Phone')
    await page.getByPlaceholder('Add a note...').fill('E2E delete test')
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()
    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('E2E delete test')).toBeVisible()

    // Click the delete icon on the row containing our note
    const row = page.locator('li').filter({ hasText: 'E2E delete test' })
    await row.getByTitle('Delete').click()

    // Confirmation dialog appears — scope to it to avoid matching select options or list items
    const deleteDialog = page.locator('.max-w-sm')
    await expect(deleteDialog.getByText('Delete Transaction')).toBeVisible()
    await expect(deleteDialog.locator('p').filter({ hasText: 'Phone' })).toBeVisible()
    await expect(deleteDialog.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // Confirm deletion — scope to dialog to avoid matching the row's delete icon button
    await deleteDialog.getByRole('button', { name: 'Delete' }).click()

    // Transaction is removed
    await expect(page.getByText('E2E delete test')).not.toBeVisible({ timeout: 10_000 })
  })

  test('transactions appear grouped by month', async ({ page }) => {
    const now = new Date()
    const currentYear = now.getFullYear()

    // Build a date in the previous month (handling January → December wrap)
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear  = now.getMonth() === 0 ? currentYear - 1 : currentYear
    const prevMonthDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-15`

    const currentMonthDate = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-15`

    // Add a transaction in the current month
    await openAddTransactionModal(page)
    await page.getByPlaceholder('0.00').fill('10')
    await page.getByLabel('Category *').selectOption('Food')
    await page.getByLabel('Date *').fill(currentMonthDate)
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()
    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 10_000 })

    // Add a transaction in the previous month
    await openAddTransactionModal(page)
    await page.getByPlaceholder('0.00').fill('20')
    await page.getByLabel('Category *').selectOption('Food')
    await page.getByLabel('Date *').fill(prevMonthDate)
    await page.getByRole('button', { name: 'Add Transaction' }).last().click()
    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 10_000 })

    // Both month group headers should be visible
    // MonthHeader renders: "YYYY / MonthName" e.g. "2026 / May"
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December']
    const currentLabel = `${currentYear} / ${months[now.getMonth()]}`
    const prevLabel    = `${prevYear} / ${months[prevMonth]}`

    await expect(page.getByText(currentLabel)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(prevLabel)).toBeVisible({ timeout: 5_000 })
  })

  test('closes modal when pressing Escape', async ({ page }) => {
    await openAddTransactionModal(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Add Transaction' })).not.toBeVisible({ timeout: 5_000 })
  })
})
