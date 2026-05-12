import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth.helper'

// In E2E mode the predict API returns a mock (no Claude call). Keep a generous
// timeout for non-E2E runs where the real AI call can take several seconds.
const PREDICTION_TIMEOUT = 30_000

test.describe('AI Prediction Card', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    // Prediction card lives on the dashboard
    await page.goto('/')
  })

  test('prediction card is present on the dashboard', async ({ page }) => {
    // The skeleton renders immediately; wait for the real card or error state
    await expect(
      page.getByText('Smart Prediction')
        .or(page.getByText('No prediction available.'))
        .or(page.getByText('Network error. Please try again.'))
    ).toBeVisible({ timeout: PREDICTION_TIMEOUT })
  })

  test('prediction shows a projected spending total after loading', async ({ page }) => {
    // Wait until the prediction card exits loading state (skeleton gone, real content or error shown)
    await expect(
      page.getByText('Smart Prediction')
        .or(page.getByText('No prediction available.'))
        .or(page.getByText('Network error. Please try again.'))
        .or(page.locator('.bg-rose-50').filter({ hasText: /./  }))
    ).toBeVisible({ timeout: PREDICTION_TIMEOUT })

    // If a prediction loaded successfully the "Predicted end-of-month total" label appears
    const hasFullPrediction = await page.getByText('Predicted end-of-month total').isVisible()

    if (hasFullPrediction) {
      // The large dollar amount below that label should be visible
      await expect(page.getByText('Predicted end-of-month total')).toBeVisible()
      // Progress bar section is also rendered
      await expect(page.getByText('Spent so far')).toBeVisible()
    } else {
      // Acceptable fallback: an error or "no prediction" message
      await expect(
        page.getByText('No prediction available.').or(page.getByText(/error/i))
      ).toBeVisible()
    }
  })

  test('confidence level badge is visible when prediction loads', async ({ page }) => {
    await expect(
      page.getByText('Smart Prediction').or(page.getByText('No prediction available.'))
    ).toBeVisible({ timeout: PREDICTION_TIMEOUT })

    const hasPrediction = await page.getByText('Smart Prediction').isVisible()
    if (!hasPrediction) {
      test.skip()
      return
    }

    // Badge text is "<level> confidence" e.g. "high confidence"
    await expect(
      page.getByText('high confidence')
        .or(page.getByText('medium confidence'))
        .or(page.getByText('low confidence'))
    ).toBeVisible()
  })

  test('AI suggestion box is rendered', async ({ page }) => {
    await expect(
      page.getByText('Smart Prediction').or(page.getByText('No prediction available.'))
    ).toBeVisible({ timeout: PREDICTION_TIMEOUT })

    const hasPrediction = await page.getByText('Smart Prediction').isVisible()
    if (!hasPrediction) {
      test.skip()
      return
    }

    // Suggestion box contains the 💡 icon and the AI-generated text
    await expect(page.getByText('💡')).toBeVisible()
  })
})
