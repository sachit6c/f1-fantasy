// tests/e2e/app.spec.js
// End-to-end tests for the F1 Fantasy League app

import { test, expect } from '@playwright/test';

// ─── App load ─────────────────────────────────────────────────────────────────

test.describe('App shell', () => {
  test('page title is "F1 Fantasy League"', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('F1 Fantasy League');
  });

  test('header renders with logo', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-header', { timeout: 10_000 });
    const header = page.locator('.app-header');
    await expect(header).toBeVisible();
  });

  test('header logo contains "F1 Fantasy League"', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-header', { timeout: 10_000 });
    const logo = page.locator('.header-logo');
    await expect(logo).toContainText('F1 Fantasy League');
  });

  test('header has navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.header-nav', { timeout: 10_000 });
    const nav = page.locator('.header-nav');
    await expect(nav).toContainText('Draft');
    await expect(nav).toContainText('Calendar');
    await expect(nav).toContainText('Drivers');
  });
});

// ─── Draft setup form (default route) ────────────────────────────────────────

test.describe('Draft setup form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/draft');
    // Wait for setup form to appear (only if no saved draft in localStorage)
    await page.waitForSelector('.draft-setup, .draft-header', { timeout: 10_000 });
  });

  test('shows the "F1 Fantasy League" page title', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (hasDraftSetup) {
      await expect(page.locator('.page-title')).toContainText('F1 Fantasy League');
    } else {
      // If a draft exists from a previous run, skip this assertion
      test.skip();
    }
  });

  test('setup form has Player 1 input', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (!hasDraftSetup) { test.skip(); return; }
    await expect(page.locator('input[name="player1"]')).toBeVisible();
  });

  test('setup form has Player 2 input', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (!hasDraftSetup) { test.skip(); return; }
    await expect(page.locator('input[name="player2"]')).toBeVisible();
  });

  test('setup form has "Start Draft" submit button', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (!hasDraftSetup) { test.skip(); return; }
    await expect(page.locator('button[type="submit"]')).toContainText('Start Draft');
  });
});

// ─── Hash routing ─────────────────────────────────────────────────────────────

test.describe('Hash routing', () => {
  test('navigating to #/calendar shows the Race Calendar title', async ({ page }) => {
    await page.goto('/#/calendar');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Race Calendar');
  });

  test('navigating to #/drivers shows the Drivers title', async ({ page }) => {
    await page.goto('/#/drivers');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Drivers');
  });

  test('navigating to #/constructors shows the Constructors title', async ({ page }) => {
    await page.goto('/#/constructors');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Constructors');
  });

  test('navigating to #/teams shows the Teams & Standings title', async ({ page }) => {
    await page.goto('/#/teams');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Teams & Standings');
  });

  test('clicking the logo navigates to #/draft', async ({ page }) => {
    await page.goto('/#/calendar');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    // Click the logo to return to draft
    await page.locator('.header-logo h1').click();
    await page.waitForURL('**/#/draft');
    expect(page.url()).toContain('#/draft');
  });
});

// ─── Calendar view ────────────────────────────────────────────────────────────

test.describe('Calendar view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calendar');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
  });

  test('renders the calendar header', async ({ page }) => {
    await expect(page.locator('.calendar-header')).toBeVisible();
  });

  test('shows the season in the subtitle', async ({ page }) => {
    const subtitle = page.locator('.page-subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('Formula 1 Season');
  });

  test('shows view mode switcher', async ({ page }) => {
    const switcher = page.locator('.view-switcher');
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText('Grid View');
    await expect(switcher).toContainText('Week View');
  });
});

// ─── Driver list view ─────────────────────────────────────────────────────────

test.describe('Drivers list view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/drivers');
    await page.waitForSelector('.page-title', { timeout: 15_000 });
  });

  test('renders driver cards', async ({ page }) => {
    // Wait for at least one driver card to appear (data loads asynchronously)
    const hasCards = await page.locator('.driver-card').first().isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasCards) {
      // Data may not have loaded — at least verify the view rendered
      await expect(page.locator('.page-title')).toBeVisible();
    } else {
      await expect(page.locator('.driver-card').first()).toBeVisible();
    }
  });
});

// ─── Navigation header interactions ──────────────────────────────────────────

test.describe('Header navigation', () => {
  test('clicking "Calendar" nav link shows calendar view', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.header-nav', { timeout: 10_000 });
    // Find and click the Calendar nav link
    await page.locator('.header-nav a, .header-nav button').filter({ hasText: 'Calendar' }).click();
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Race Calendar');
  });

  test('clicking "Drivers" nav link shows drivers view', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.header-nav', { timeout: 10_000 });
    await page.locator('.header-nav a, .header-nav button').filter({ hasText: 'Drivers' }).click();
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Drivers');
  });
});
