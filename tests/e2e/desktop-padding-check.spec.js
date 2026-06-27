// Sanity-check: at desktop viewport (1280x800) recent WCAG mobile rules MUST NOT
// inflate button/input/nav heights. If they do, the breakpoint regressed.
import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

test.use({ viewport: { width: 1280, height: 800 } });

test('desktop @ 1280x800: WCAG mobile rules do NOT bloat sizes', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const measurements = await page.evaluate(() => {
    const probe = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { sel, w: Math.round(r.width), h: Math.round(r.height) };
    };
    return [
      probe('.nav-link'),
      probe('.theme-toggle-btn'),
      probe('.btn-settings'),
      probe('.app-footer-links a'),
      probe('.btn-primary'),
      probe('.header-wordmark'),
    ].filter(Boolean);
  });

  console.log('desktop measurements:', JSON.stringify(measurements, null, 2));

  // Heuristic: any of these elements ≥44px tall at desktop means mobile rule is leaking.
  for (const m of measurements) {
    // Allow .btn-primary up to ~44 (its native size), but nav/footer/icon buttons
    // should be smaller than 44 on desktop.
    if (m.sel === '.btn-primary') continue;
    expect(m.h, `${m.sel} too tall (${m.h}px) — mobile @media leaking onto desktop`).toBeLessThan(44);
  }
});
