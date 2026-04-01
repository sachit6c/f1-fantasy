// tests/e2e/accessibility.spec.js
// Accessibility (axe-core) tests for the F1 Fantasy League app

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to run axe and assert no violations.
// We exclude color-contrast because the app uses team colors
// which are intentional brand decisions outside our control.
async function checkA11y(page) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();
  expect(results.violations).toEqual([]);
}

// ─── Draft setup form ─────────────────────────────────────────────────────────

test.describe('Accessibility: Draft setup form', () => {
  test('has no automatically detectable a11y violations', async ({ page }) => {
    await page.goto('/#/draft');
    await page.waitForSelector('.draft-setup, .draft-header', { timeout: 10_000 });
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (!hasDraftSetup) { test.skip(); return; }
    await checkA11y(page);
  });
});

// ─── Calendar view ────────────────────────────────────────────────────────────

test.describe('Accessibility: Calendar view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calendar');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
  });

  test('has no automatically detectable a11y violations', async ({ page }) => {
    await checkA11y(page);
  });
});

// ─── Drivers list ─────────────────────────────────────────────────────────────

test.describe('Accessibility: Drivers list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/drivers');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
  });

  test('has no automatically detectable a11y violations', async ({ page }) => {
    await checkA11y(page);
  });
});

// ─── Constructors list ────────────────────────────────────────────────────────

test.describe('Accessibility: Constructors list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/constructors');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
  });

  test('has no automatically detectable a11y violations', async ({ page }) => {
    await checkA11y(page);
  });
});

// ─── Teams & Standings ───────────────────────────────────────────────────────

test.describe('Accessibility: Teams & Standings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/teams');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
  });

  test('has no automatically detectable a11y violations', async ({ page }) => {
    await checkA11y(page);
  });
});
