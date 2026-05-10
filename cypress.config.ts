import { defineConfig } from 'cypress'

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'e2e/cypress/**/*.cy.ts',
    supportFile: 'e2e/cypress/support/e2e.ts',
    fixturesFolder: 'e2e/cypress/fixtures',
    screenshotsFolder: 'e2e/cypress/screenshots',
    videosFolder: 'e2e/cypress/videos',
    video: true,
    screenshotOnRunFailure: true,
  },
})
