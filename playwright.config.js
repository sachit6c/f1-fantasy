// playwright.config.js
// Playwright E2E test configuration

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile.spec.js']
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: ['**/mobile.spec.js']
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: ['**/mobile.spec.js']
    }
  ],
  webServer: {
    command: 'node_modules/.bin/serve . -p 4173 -s',
    port: 4173,
    reuseExistingServer: true,
    timeout: 10_000
  }
});
