/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
      createTransaction(data: {
        amount: number
        type: 'income' | 'expense'
        category: string
        subcategory?: string
        description?: string
        date: string
        mood?: string
      }): Chainable<Cypress.Response<unknown>>
    }
  }
}

// Sets the e2e_session cookie so the Next.js server returns a mock user
// instead of redirecting to /login. Requires the dev server to be running
// with E2E_TESTING=true (set in .env.local).
Cypress.Commands.add('login', () => {
  cy.setCookie('e2e_session', 'true')
})

Cypress.Commands.add('createTransaction', (data) => {
  return cy.request({
    method: 'POST',
    url: '/api/transactions',
    body: data,
    failOnStatusCode: false,
  })
})

export {}
