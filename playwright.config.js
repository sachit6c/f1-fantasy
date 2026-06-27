// playwright.config.js
// Playwright E2E test configuration

import { defineConfig, devices } from '@playwright/test';

// Custom Samsung device profiles (not included in Playwright's built-in device list)
// Values reflect the CSS viewport reported by Chrome on the device, not native pixels.
const samsungS23Ultra = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 3.5,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium'
};

const samsungF55 = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-E556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  viewport: { width: 384, height: 854 },
  deviceScaleFactor: 2.8125,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium'
};

export default defineConfig({
  testDir: './tests/e2e',
  // Playwright cleans this dir before each run. Keep it separate from the
  // mobile-audit artifacts the spec writes to test-results/mobile-audit/.
  outputDir: './test-results/.playwright-output',
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
    },
    {
      name: 'samsung-s23-ultra',
      use: samsungS23Ultra,
      testMatch: ['**/mobile-audit.spec.js']
    },
    {
      name: 'samsung-f55',
      use: samsungF55,
      testMatch: ['**/mobile-audit.spec.js']
    }
  ],
  webServer: {
    command: 'node_modules/.bin/serve . -p 4173 -s',
    port: 4173,
    reuseExistingServer: true,
    timeout: 10_000
  }
});
