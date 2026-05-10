import '@testing-library/cypress/add-commands'
import './commands'

// Stub browser-side Supabase auth requests so no real network calls
// are made to Supabase during E2E tests.
beforeEach(() => {
  cy.intercept('POST', '**/auth/v1/logout', { statusCode: 204, body: {} })
  cy.intercept('POST', '**/auth/v1/token**', { statusCode: 200, body: {} })
})
