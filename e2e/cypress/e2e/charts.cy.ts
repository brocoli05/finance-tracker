/// <reference types="cypress" />

describe('Charts', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/transactions', { fixture: 'transactions.json' }).as('getTransactions')

    cy.login()
    cy.visit('/charts')
    cy.wait('@getTransactions')
  })

  describe('chart rendering', () => {
    it('shows summary cards and chart after load', () => {
      cy.contains('Total Income').should('be.visible')
      cy.contains('Total Expenses').should('be.visible')
      cy.contains('Analytics').should('be.visible')
      cy.get('svg').should('exist')
    })

    it('renders the chart after clicking the Daily tab', () => {
      cy.contains('button', 'Daily').click()
      cy.contains('button', 'Daily').should('have.class', 'bg-indigo-600')
      cy.get('svg').should('exist')
    })
  })

  describe('period tab switching', () => {
    const tabs = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const

    tabs.forEach((tab) => {
      it(`activates the ${tab} tab and deactivates the others`, () => {
        cy.contains('button', tab).click()
        cy.contains('button', tab).should('have.class', 'bg-indigo-600')

        tabs
          .filter((t) => t !== tab)
          .forEach((other) => {
            cy.contains('button', other).should('not.have.class', 'bg-indigo-600')
          })
      })
    })
  })

  describe('CSV export', () => {
    it('Export CSV button is enabled when there is data', () => {
      cy.contains('button', 'Export CSV').should('not.be.disabled')
    })

    it('triggers a download when Export CSV is clicked', () => {
      cy.window().then((win) => {
        cy.stub(win.URL, 'createObjectURL').as('createObjectURL').returns('blob:fake')
        // Stub both sides of the DOM dance so they don't conflict
        cy.stub(win.document.body, 'appendChild')
        cy.stub(win.document.body, 'removeChild')
      })

      cy.contains('button', 'Export CSV').click()
      cy.get('@createObjectURL').should('have.been.called')
    })

    it('Export CSV button is disabled when there are no transactions', () => {
      cy.intercept('GET', '/api/transactions', { body: { data: [] } }).as('emptyTransactions')
      cy.visit('/charts')
      cy.wait('@emptyTransactions')

      // With no transactions, all periods have zero data — button disabled
      cy.contains('button', 'Export CSV').should('be.disabled')
    })
  })

  describe('pie chart category filter', () => {
    it('shows the Expense Breakdown section', () => {
      cy.contains('Expense Breakdown').should('be.visible')
    })

    it('filters the transaction list when a category legend button is clicked', () => {
      cy.contains('Expense Breakdown')
        .parents('.rounded-2xl')
        .within(() => {
          cy.contains('button', 'Food').click()
        })

      // Transaction list heading updates to the active category
      cy.contains('Food').should('be.visible')
      cy.contains('Clear filter').should('be.visible')
    })

    it('clears the category filter when Clear filter is clicked', () => {
      cy.contains('Expense Breakdown')
        .parents('.rounded-2xl')
        .within(() => {
          cy.contains('button', 'Food').click()
        })

      cy.contains('Clear filter').click()
      cy.contains('Clear filter').should('not.exist')
      cy.contains('Transactions').should('be.visible')
    })

    it('toggles the filter off when the same category is clicked again', () => {
      cy.contains('Expense Breakdown')
        .parents('.rounded-2xl')
        .within(() => {
          cy.contains('button', 'Rent').click()
          cy.contains('button', 'Rent').click()
        })

      cy.contains('Clear filter').should('not.exist')
    })
  })
})
