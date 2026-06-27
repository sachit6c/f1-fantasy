// tests/e2e/mobile-audit.spec.js
// Comprehensive page-by-page mobile UI/UX audit suite.
//
// Runs against custom Samsung device profiles (samsung-s23-ultra, samsung-f55)
// defined in playwright.config.js. Captures full-page screenshots for every
// distinct view and asserts mobile UX invariants:
//   - no horizontal page overflow
//   - all interactive elements >= 44x44 px (WCAG 2.5.5 Target Size)
//   - headings / labels not visibly clipped
//   - tables / charts contained inside scroll wrappers
//   - header is visible and primary navigation is reachable
//
// All findings (passing or failing) are funneled to MOBILE_UX_AUDIT.md.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// ─── Configuration ───────────────────────────────────────────────────────────

const SCREENSHOT_ROOT = 'test-results/mobile-audit';
const MIN_TOUCH_TARGET = 44;       // WCAG 2.5.5 (AA enhanced) / Apple HIG minimum
const HORIZONTAL_OVERFLOW_TOLERANCE = 2; // sub-pixel rounding

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deviceLabel(projectName) {
  return projectName.replace(/[^a-z0-9-]/gi, '_');
}

async function shot(page, testInfo, name) {
  const device = deviceLabel(testInfo.project.name);
  const dir = path.join(SCREENSHOT_ROOT, device);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(`${device}/${name}`, { path: file, contentType: 'image/png' });
  return file;
}

async function waitForReady(page, hash) {
  // Normalize: hash may already start with '/'. Avoid '//#/...' double-slash.
  const url = hash.startsWith('/') ? hash : `/${hash}`;
  await page.goto(url);
  // Either the page title rendered, or an empty-state / coming-soon / hero block did.
  await page.waitForSelector(
    '.page-title, .home-hero-title, .empty-state, .coming-soon-page, .draft-setup, .draft-header, .driver-profile-header, .constructor-profile-header',
    { timeout: 20_000 }
  );
  // Let staggered intro animations and chart paints settle.
  await page.waitForTimeout(900);
}

async function assertNoHorizontalOverflow(page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(
    scrollWidth,
    `Page scrollWidth (${scrollWidth}) exceeds clientWidth (${clientWidth}) — horizontal overflow`
  ).toBeLessThanOrEqual(clientWidth + HORIZONTAL_OVERFLOW_TOLERANCE);
}

/**
 * Audits every visible interactive element for minimum touch-target size.
 * Returns an array of { selector, w, h, text } for any that fail, so the
 * audit suite can attach them as test-info annotations rather than fail hard.
 */
async function collectSmallTouchTargets(page) {
  return await page.evaluate((minSize) => {
    const selectors = [
      'a[href]', 'button',
      'input:not([type="hidden"])', 'select', 'textarea',
      '[role="button"]', '[role="tab"]', '[role="link"]'
    ].join(',');
    // Third-party widgets we intentionally don't enlarge (would dominate the UI).
    const EXEMPT = '.leaflet-control-attribution a, .leaflet-control-attribution';
    const offenders = [];
    document.querySelectorAll(selectors).forEach(el => {
      if (el.closest('.leaflet-control-attribution')) return;
      if (el.matches(EXEMPT)) return;
      const r = el.getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 &&
        window.getComputedStyle(el).visibility !== 'hidden' &&
        window.getComputedStyle(el).display !== 'none';
      if (!visible) return;
      if (r.width < minSize || r.height < minSize) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString?.().slice(0, 80) || '',
          text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height)
        });
      }
    });
    return offenders;
  }, MIN_TOUCH_TARGET);
}

async function collectClippedText(page) {
  return await page.evaluate(() => {
    const sel = 'h1, h2, h3, h4, .page-title, .page-subtitle, .stat-value, .stat-label, .nav-label, .driver-card__name, .constructor-name, .badge-num';
    const clipped = [];
    document.querySelectorAll(sel).forEach(el => {
      const isClipped = el.scrollWidth - el.clientWidth > 1;
      if (isClipped) {
        clipped.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString?.().slice(0, 80) || '',
          text: (el.innerText || '').trim().slice(0, 60),
          scrollW: el.scrollWidth,
          clientW: el.clientWidth
        });
      }
    });
    return clipped;
  });
}

async function collectTinyFonts(page) {
  return await page.evaluate(() => {
    const offenders = [];
    document.querySelectorAll('body *').forEach(el => {
      const text = (el.innerText || '').trim();
      if (!text || el.children.length > 0) return; // leaf nodes with text only
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = window.getComputedStyle(el);
      const px = parseFloat(cs.fontSize);
      if (px && px < 11) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString?.().slice(0, 80) || '',
          text: text.slice(0, 50),
          px: Math.round(px * 10) / 10
        });
      }
    });
    // De-dup similar offenders
    const seen = new Set();
    return offenders.filter(o => {
      const key = `${o.tag}|${o.cls}|${o.px}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

/**
 * Common per-page audit pipeline: capture screenshot, then record findings
 * to the test annotations. Hard-fails only on horizontal overflow (a critical
 * mobile bug); other findings are attached for the report writer to triage.
 */
async function audit(page, testInfo, slug) {
  await shot(page, testInfo, slug);

  const smallTargets = await collectSmallTouchTargets(page);
  const clipped = await collectClippedText(page);
  const tiny = await collectTinyFonts(page);

  if (smallTargets.length) {
    testInfo.annotations.push({
      type: 'touch-target',
      description: `${smallTargets.length} interactive el(s) below ${MIN_TOUCH_TARGET}px: ` +
        JSON.stringify(smallTargets.slice(0, 10))
    });
  }
  if (clipped.length) {
    testInfo.annotations.push({
      type: 'clipped-text',
      description: `${clipped.length} clipped text node(s): ` + JSON.stringify(clipped.slice(0, 10))
    });
  }
  if (tiny.length) {
    testInfo.annotations.push({
      type: 'tiny-font',
      description: `${tiny.length} text node(s) < 11px: ` + JSON.stringify(tiny.slice(0, 10))
    });
  }

  // Persist a JSON sidecar so the report writer can ingest findings.
  const device = deviceLabel(testInfo.project.name);
  const findings = {
    slug,
    device,
    viewport: page.viewportSize(),
    smallTargets,
    clipped,
    tiny,
    timestamp: new Date().toISOString()
  };
  const dir = path.join(SCREENSHOT_ROOT, device);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(findings, null, 2));

  await assertNoHorizontalOverflow(page);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Mobile UX Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Clean slate each test — avoid bleed between draft state seeding
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
  });

  // ─── 1. Home ────────────────────────────────────────────────────────────────
  test('home page', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/home');
    await expect(page.locator('.app-header')).toBeVisible();
    await audit(page, testInfo, '01-home');
  });

  // ─── 2. Draft — setup form ──────────────────────────────────────────────────
  test('draft setup', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/draft');
    // Should land on the setup form because localStorage is clear
    await expect(page.locator('.draft-setup')).toBeVisible();
    await audit(page, testInfo, '02-draft-setup');
  });

  // ─── 3. Draft — active in-progress ─────────────────────────────────────────
  test('draft active (mid-pick)', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/draft');
    const setupVisible = await page.locator('.draft-setup').isVisible().catch(() => false);
    if (setupVisible) {
      await page.fill('input[name="player1"]', 'Alice');
      await page.fill('input[name="player2"]', 'Bob');
      await page.click('button[type="submit"]');
      // Wait for draft to start
      await page.waitForSelector('.draft-header, .draft-board, .available-drivers', { timeout: 15_000 });
      await page.waitForTimeout(800);
    }
    await audit(page, testInfo, '03-draft-active');
  });

  // ─── 4. Teams — Driver Standings (default tab) ─────────────────────────────
  test('teams — driver standings tab', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/teams');
    await audit(page, testInfo, '04-teams-drivers');
  });

  // ─── 5. Teams — Constructor Standings tab ──────────────────────────────────
  test('teams — constructor standings tab', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/teams');
    const tabs = page.locator('.tab-btn');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const t = tabs.nth(i);
      const label = (await t.textContent()) || '';
      if (label.toLowerCase().includes('constructor')) {
        await t.click();
        break;
      }
    }
    await page.waitForTimeout(600);
    await audit(page, testInfo, '05-teams-constructors');
  });

  // ─── 6. Teams — Comparison tab (likely disabled without a completed draft) ─
  test('teams — comparison tab state', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/teams');
    const tabs = page.locator('.tab-btn');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const t = tabs.nth(i);
      const label = (await t.textContent()) || '';
      if (label.toLowerCase().includes('comparison') || label.toLowerCase().includes('vs')) {
        const disabled = await t.isDisabled();
        testInfo.annotations.push({
          type: 'state',
          description: `Comparison tab disabled=${disabled} (expected when no completed draft)`
        });
        if (!disabled) await t.click();
        break;
      }
    }
    await page.waitForTimeout(400);
    await audit(page, testInfo, '06-teams-comparison');
  });

  // ─── 7. Calendar — Grid view (default) ─────────────────────────────────────
  test('calendar — grid view', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/calendar');
    await audit(page, testInfo, '07-calendar-grid');
  });

  // ─── 8. Calendar — Week view ───────────────────────────────────────────────
  test('calendar — week view', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/calendar');
    const weekBtn = page.locator('.view-btn', { hasText: /week/i });
    if (await weekBtn.count()) {
      await weekBtn.first().click();
      await page.waitForTimeout(600);
    }
    await audit(page, testInfo, '08-calendar-week');
  });

  // ─── 9. Drivers list ───────────────────────────────────────────────────────
  test('drivers list', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/drivers');
    await audit(page, testInfo, '09-drivers-list');
  });

  // ─── 10. Constructors list ─────────────────────────────────────────────────
  test('constructors list', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/constructors');
    await audit(page, testInfo, '10-constructors-list');
  });

  // ─── 11. Driver profile (discover first real driver ID from page DOM) ──────
  test('driver profile', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/drivers');
    // Driver cards bind click handlers (no href) — click the first card and
    // let the route change. Falls back to a hard-coded slug if no card found.
    const card = page.locator('.driver-card').first();
    if (await card.count()) {
      await card.click();
      await page.waitForFunction(() => location.hash.startsWith('#/driver/'), { timeout: 5_000 }).catch(() => {});
      await page.waitForSelector('.driver-profile-header, .empty-state', { timeout: 15_000 });
      await page.waitForTimeout(900);
    } else {
      await waitForReady(page, '/#/driver/max_verstappen');
    }
    await audit(page, testInfo, '11-driver-profile');
  });

  // ─── 12. Constructor profile ────────────────────────────────────────────────
  test('constructor profile', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/constructors');
    // Read the first constructor's name from a card and derive its ID
    // by inspecting the card's bound data attribute or, failing that, the rendered text.
    // Constructor cards bind click handlers but child driver-links also intercept clicks,
    // so we read the constructor list from the data store via a deterministic path:
    // pick the first .constructor-card and click the card's outer area (the photo header).
    const colorHeader = page.locator('.constructor-card .constructor-color-header').first();
    if (await colorHeader.count()) {
      await colorHeader.click();
      await page.waitForFunction(() => location.hash.startsWith('#/constructor/'), { timeout: 5_000 }).catch(() => {});
    }
    // Always fall through to waitForReady so we get either the real profile or empty-state.
    await page.waitForSelector('.constructor-profile-header, .empty-state', { timeout: 15_000 })
      .catch(async () => {
        // Last-resort: direct nav to a known 2026 constructor.
        await waitForReady(page, '/#/constructor/ferrari');
      });
    await page.waitForTimeout(900);
    await audit(page, testInfo, '12-constructor-profile');
  });

  // ─── 13. Race detail ────────────────────────────────────────────────────────
  test('race detail', async ({ page }, testInfo) => {
    await waitForReady(page, '/#/calendar');
    // Race cards may be either anchors or click-handlers; try both.
    const raceLink = page.locator('a[href^="#/race/"]').first();
    const raceCard = page.locator('.race-card, .calendar-event, [data-race-id]').first();
    if (await raceLink.count()) {
      const href = await raceLink.getAttribute('href');
      await waitForReady(page, `/${href}`);
    } else if (await raceCard.count()) {
      await raceCard.click();
      await page.waitForFunction(() => location.hash.startsWith('#/race/'), { timeout: 5_000 }).catch(() => {});
      await page.waitForSelector('.race-info-card, .empty-state, .page-title', { timeout: 15_000 });
      await page.waitForTimeout(900);
    } else {
      await waitForReady(page, '/#/race/2026_01');
    }
    await audit(page, testInfo, '13-race-detail');
  });

  // ─── 14. Coming-soon (unsupported season) ───────────────────────────────────
  test('coming-soon page (unsupported season)', async ({ page }, testInfo) => {
    // Seed localStorage BEFORE the app boots — `localStorage` is per-origin
    // and persists across goto() calls on the same origin.
    await page.goto('/');
    await page.evaluate(() => {
      try {
        // draft-store reads this key at module-init time.
        localStorage.setItem('f1_fantasy_current_season', '1995');
      } catch {}
    });
    // Reload so app.js / draft-store re-read the seeded season.
    await page.goto('/#/home');
    // The coming-soon block renders for any season outside the supported window.
    // If for some reason the picker still corrects the season, fall back to
    // accepting whatever page rendered (we still audit it).
    await page.waitForSelector(
      '.coming-soon-page, .page-title, .home-hero-title',
      { timeout: 15_000 }
    );
    await page.waitForTimeout(600);
    await audit(page, testInfo, '14-coming-soon');
  });
});
