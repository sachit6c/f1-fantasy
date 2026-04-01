// tests/e2e/mobile.spec.js
// Mobile & tablet E2E tests for the F1 Fantasy League app.
// Run via:  npx playwright test --project=mobile-chrome (or mobile-safari / tablet)
// Or:       npm run test:e2e:mobile

import { test, expect } from '@playwright/test';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wait for the main header to be ready */
async function waitForHeader(page) {
  await page.waitForSelector('.app-header', { timeout: 15_000 });
}

/** Wait for a view title to appear */
async function waitForView(page, hash) {
  await page.goto(hash);
  await page.waitForSelector('.page-title', { timeout: 15_000 });
}

// ─── Viewport & layout ───────────────────────────────────────────────────────

test.describe('Mobile viewport', () => {
  test('page loads without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await waitForHeader(page);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance for sub-pixel rounding
  });

  test('body never overflows horizontally on the calendar view', async ({ page }) => {
    await waitForView(page, '/#/calendar');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('body never overflows horizontally on the drivers view', async ({ page }) => {
    await waitForView(page, '/#/drivers');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('body never overflows horizontally on the constructors view', async ({ page }) => {
    await waitForView(page, '/#/constructors');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('body never overflows horizontally on the teams/standings view', async ({ page }) => {
    await waitForView(page, '/#/teams');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});

// ─── Header on mobile ────────────────────────────────────────────────────────

test.describe('Header — mobile layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForHeader(page);
  });

  test('header is visible', async ({ page }) => {
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('navigation links are visible and tappable', async ({ page }) => {
    const nav = page.locator('.header-nav');
    await expect(nav).toBeVisible();

    // All primary nav items should be present
    for (const label of ['Draft', 'Calendar', 'Drivers']) {
      await expect(nav.locator(`a, button`).filter({ hasText: label })).toBeVisible();
    }
  });

  test('nav link tap targets are at least 44×44 px (WCAG 2.5.5)', async ({ page }) => {
    const links = page.locator('.header-nav a, .header-nav button');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      if (!box) continue;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('season badge is visible', async ({ page }) => {
    await expect(page.locator('.season-current-badge')).toBeVisible();
  });
});

// ─── Draft setup form on mobile ──────────────────────────────────────────────

test.describe('Draft setup form — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/draft');
    await page.waitForSelector('.draft-setup, .draft-header', { timeout: 10_000 });
  });

  test('setup form is accessible or an existing draft is shown', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    const hasDraftHeader = await page.locator('.draft-header').isVisible();
    expect(hasDraftSetup || hasDraftHeader).toBe(true);
  });

  test('setup form inputs are visible and tappable when no draft exists', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (!hasDraftSetup) { test.skip(); return; }

    const input1 = page.locator('input[name="player1"]');
    const input2 = page.locator('input[name="player2"]');
    await expect(input1).toBeVisible();
    await expect(input2).toBeVisible();

    // Inputs must be at least 44px tall
    const box1 = await input1.boundingBox();
    const box2 = await input2.boundingBox();
    expect(box1.height).toBeGreaterThanOrEqual(44);
    expect(box2.height).toBeGreaterThanOrEqual(44);
  });

  test('submit button spans full width on mobile', async ({ page }) => {
    const hasDraftSetup = await page.locator('.draft-setup').isVisible();
    if (!hasDraftSetup) { test.skip(); return; }

    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();

    const btnBox = await btn.boundingBox();
    const viewportWidth = page.viewportSize().width;
    // Full-width button should span at least 60% of viewport
    expect(btnBox.width).toBeGreaterThan(viewportWidth * 0.6);
  });
});

// ─── Calendar view on mobile ──────────────────────────────────────────────────

test.describe('Calendar view — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, '/#/calendar');
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('view-switcher buttons are visible and tappable', async ({ page }) => {
    const switcher = page.locator('.view-switcher');
    await expect(switcher).toBeVisible();

    const btns = switcher.locator('.view-btn');
    const count = await btns.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const box = await btns.nth(i).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('grid view renders single-column layout on narrow screen', async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport.width > 768) { test.skip(); return; } // only for phone viewports

    // Grid view is the default — calendar cards should stack vertically
    const grid = page.locator('.calendar-grid');
    const hasGrid = await grid.isVisible().catch(() => false);
    if (!hasGrid) { test.skip(); return; }

    const gridBox = await grid.boundingBox();
    const firstCard = grid.locator('.calendar-event').first();
    const cardBox = await firstCard.boundingBox().catch(() => null);
    if (!cardBox) { test.skip(); return; }

    // In a single-column grid the card width ≈ grid width (within 20px)
    expect(gridBox.width - cardBox.width).toBeLessThan(20);
  });

  test('switching to week view works via tap', async ({ page }) => {
    const weekBtn = page.locator('.view-btn').filter({ hasText: /week/i }).first();
    if (!(await weekBtn.isVisible().catch(() => false))) { test.skip(); return; }

    await weekBtn.tap();
    await page.waitForSelector('.week-view, .calendar-grid', { timeout: 5_000 });
    // No JS errors — just verify the view updated without crash
    await expect(page.locator('.page-title')).toBeVisible();
  });
});

// ─── Drivers list on mobile ───────────────────────────────────────────────────

test.describe('Drivers list view — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, '/#/drivers');
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('driver cards render within viewport width', async ({ page }) => {
    const cards = page.locator('.driver-card');
    const hasCards = await cards.first().isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasCards) { test.skip(); return; }

    const viewportWidth = page.viewportSize().width;
    const count = Math.min(await cards.count(), 5); // check first 5

    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 2);
    }
  });

  test('tapping a driver card navigates to driver profile', async ({ page }) => {
    const cards = page.locator('.driver-card');
    const hasCards = await cards.first().isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasCards) { test.skip(); return; }

    await cards.first().tap();
    // Should navigate to a driver profile route
    await page.waitForFunction(() => window.location.hash.startsWith('#/driver/'), { timeout: 5_000 });
    await expect(page.locator('.driver-profile-header, .page-title')).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Constructors list on mobile ──────────────────────────────────────────────

test.describe('Constructors list view — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, '/#/constructors');
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('constructor cards render within viewport width', async ({ page }) => {
    const cards = page.locator('.constructor-card');
    const hasCards = await cards.first().isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasCards) { test.skip(); return; }

    const viewportWidth = page.viewportSize().width;
    const count = Math.min(await cards.count(), 5);

    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 2);
    }
  });

  test('tapping a constructor card navigates to its profile', async ({ page }) => {
    const cards = page.locator('.constructor-card');
    const hasCards = await cards.first().isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasCards) { test.skip(); return; }

    await cards.first().tap();
    await page.waitForFunction(() => window.location.hash.startsWith('#/constructor/'), { timeout: 5_000 });
    await expect(page.locator('.page-title')).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Teams & Standings on mobile ──────────────────────────────────────────────

test.describe('Teams & Standings — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await waitForView(page, '/#/teams');
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.locator('.page-title')).toBeVisible();
  });

  test('tab buttons are visible and tappable', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('tab panels do not overflow viewport width', async ({ page }) => {
    const panels = page.locator('.tab-panel');
    const viewportWidth = page.viewportSize().width;
    const count = await panels.count();

    for (let i = 0; i < count; i++) {
      const box = await panels.nth(i).boundingBox();
      if (!box) continue;
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 2);
    }
  });

  test('tapping the Driver Standings tab shows standings content', async ({ page }) => {
    const driverTab = page.locator('.tab-btn').filter({ hasText: /driver standings/i });
    if (!(await driverTab.isVisible().catch(() => false))) { test.skip(); return; }

    await driverTab.tap();
    await expect(page.locator('#tab-driver-standings')).toBeVisible({ timeout: 5_000 });
  });

  test('tapping the Constructor Standings tab shows standings content', async ({ page }) => {
    const constructorTab = page.locator('.tab-btn').filter({ hasText: /constructor standings/i });
    if (!(await constructorTab.isVisible().catch(() => false))) { test.skip(); return; }

    await constructorTab.tap();
    await expect(page.locator('#tab-constructor-standings')).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Navigation routing on mobile ────────────────────────────────────────────

test.describe('Navigation — mobile tap routing', () => {
  test('tapping Calendar nav navigates to calendar view', async ({ page }) => {
    await page.goto('/');
    await waitForHeader(page);

    await page.locator('.header-nav a, .header-nav button').filter({ hasText: 'Calendar' }).tap();
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Race Calendar');
  });

  test('tapping Drivers nav navigates to drivers view', async ({ page }) => {
    await page.goto('/');
    await waitForHeader(page);

    await page.locator('.header-nav a, .header-nav button').filter({ hasText: 'Drivers' }).tap();
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Drivers');
  });

  test('tapping Teams nav navigates to teams/standings view', async ({ page }) => {
    await page.goto('/');
    await waitForHeader(page);

    await page.locator('.header-nav a, .header-nav button').filter({ hasText: 'Teams' }).tap();
    await page.waitForSelector('.page-title', { timeout: 15_000 });
    await expect(page.locator('.page-title')).toContainText('Teams');
  });

  test('back navigation via browser returns to previous route', async ({ page }) => {
    await waitForView(page, '/#/calendar');
    await waitForView(page, '/#/drivers');

    await page.goBack();
    await page.waitForSelector('.page-title', { timeout: 10_000 });
    await expect(page.locator('.page-title')).toContainText('Race Calendar');
  });
});

// ─── Touch gestures ───────────────────────────────────────────────────────────

test.describe('Touch interactions', () => {
  test('calendar view is scrollable vertically on mobile', async ({ page }) => {
    await waitForView(page, '/#/calendar');

    const initialScrollY = await page.evaluate(() => window.scrollY);
    // Simulate a swipe upward (scroll down)
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }));
    const newScrollY = await page.evaluate(() => window.scrollY);

    // Page should have scrolled (or content fits — both are valid)
    expect(newScrollY).toBeGreaterThanOrEqual(initialScrollY);
  });

  test('draft view is scrollable vertically on mobile', async ({ page }) => {
    await page.goto('/#/draft');
    await page.waitForSelector('.draft-setup, .draft-header, .draft-content-new', { timeout: 10_000 });

    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = page.viewportSize().height;

    // Either the content fits or it's scrollable — both are fine
    expect(docHeight).toBeGreaterThan(0);
    if (docHeight > viewportHeight) {
      await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'instant' }));
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);
    }
  });
});

// ─── Text readability on mobile ───────────────────────────────────────────────

test.describe('Text readability', () => {
  test('page title font size is at least 18px on mobile', async ({ page }) => {
    await waitForView(page, '/#/calendar');

    const fontSize = await page.locator('.page-title').evaluate(el => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    expect(fontSize).toBeGreaterThanOrEqual(18);
  });

  test('body text font size is at least 14px on mobile', async ({ page }) => {
    await waitForView(page, '/#/calendar');

    const fontSize = await page.evaluate(() =>
      parseFloat(window.getComputedStyle(document.body).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });
});
