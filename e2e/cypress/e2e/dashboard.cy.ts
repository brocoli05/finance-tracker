/// <reference types="cypress" />

describe('Dashboard', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/transactions', { fixture: 'transactions.json' }).as('getTransactions')
    cy.intercept('GET', '/api/goals',        { fixture: 'goals.json' }).as('getGoals')
    cy.intercept('GET', '/api/predict',      { body: { data: null } }).as('getPredict')

    cy.login()
    cy.visit('/')
    cy.wait(['@getTransactions', '@getGoals'])
  })

  describe('sections visible', () => {
    it('shows the SpendSight logo and all nav links', () => {
      cy.contains('SpendSight').should('be.visible')
      cy.contains('a', 'Dashboard').should('be.visible')
      cy.contains('a', 'Transactions').should('be.visible')
      cy.contains('a', 'Goals').should('be.visible')
      cy.contains('a', 'Charts').should('be.visible')
    })

    it('shows the monthly summary cards', () => {
      cy.contains('This Month Income').should('be.visible')
      cy.contains('This Month Expenses').should('be.visible')
      cy.contains(/Net Saved|Net Spent/).should('be.visible')
    })

    it('shows the Recent Transactions section with fixture data', () => {
      cy.contains('Recent Transactions').should('be.visible')
      cy.contains('Payroll').should('be.visible')
      cy.contains('Food').should('be.visible')
    })

    it('shows the Active Goals section with only unachieved goals', () => {
      cy.contains('Active Goals').should('be.visible')
      cy.contains('Emergency Fund').should('be.visible')
      cy.contains('New Laptop').should('be.visible')
      // is_achieved: true goal must not appear in Active Goals
      cy.contains('Japan Trip').should('not.exist')
    })
  })

  describe('navigation', () => {
    it('navigates to Transactions page', () => {
      cy.contains('a', 'Transactions').click()
      cy.url().should('include', '/transactions')
    })

    it('navigates to Goals page', () => {
      cy.contains('a', 'Goals').click()
      cy.url().should('include', '/goals')
    })

    it('navigates to Charts page', () => {
      cy.contains('a', 'Charts').click()
      cy.url().should('include', '/charts')
    })

    it('navigates back to Dashboard from another page', () => {
      cy.contains('a', 'Transactions').click()
      cy.url().should('include', '/transactions')
      cy.contains('a', 'Dashboard').click()
      cy.url().should('eq', Cypress.config('baseUrl') + '/')
    })
  })

  describe('sign out', () => {
    it('redirects to /login after clicking Sign Out', () => {
      cy.contains('button', 'Sign Out').click()
      cy.url().should('include', '/login')
      cy.contains('SpendSight').should('be.visible')
    })
  })
})
