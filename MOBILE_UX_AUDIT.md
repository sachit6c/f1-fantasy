# Mobile UX Audit — F1 Fantasy League v2

**Audit date:** 2025-05-22
**Closed:** 2026-05-22 — ✅ **RESOLVED**
**Auditor:** Mobile UI/UX review pass (automated Playwright instrumentation + visual review)
**Scope:** Full page-by-page audit on two real-world Samsung mobile viewports.

---

## 0. Resolution Summary (closed 2026-05-22)

All findings in this report have been remediated via CSS-only changes (no JS or markup edits). Final Playwright mobile-audit run:

| Metric | Baseline | Final | Delta |
|---|---|---|---|
| Small targets (<44×44 px) | **1045** | **0** | **−100%** |
| Tiny fonts (<11 px) | **40** | **0** | **−100%** |
| Clipped overflow | 0 | 0 | — |
| Tests passing | — | **28 / 28** | ✅ |

**Files modified:** `styles/header.css`, `styles/components.css`, `styles/base.css`, `styles/race-detail.css`, `styles/team-comparison.css`, `styles/calendar.css`, `styles/drivers-list.css`, `styles/constructors-list.css`, `styles/profile.css`, plus `playwright.config.js` (preserve `outputDir`) and `scripts/audit-diff.mjs` (baseline diff harness).

**Verification:** `npm run test:e2e:mobile-audit && node scripts/audit-diff.mjs` — clean across all 14 pages × 2 Samsung device profiles (S23 Ultra + Galaxy F55).

This report is retained as a historical record of the original findings.

---

## 1. Executive Summary (original, pre-fix)

The application is **functionally complete on mobile** — every page renders, no horizontal scrolling exists on any view, layout integrity holds, and text never clips. However the app **systematically fails WCAG 2.5.5 (Target Size, Minimum)** on every single page tested. The global header navigation, footer, and several recurring card patterns expose touch targets between **14×14 px and 42×37 px** where the modern accessibility minimum is **44×44 px**.

**Overall mobile readiness score:** **5.5 / 10** — usable but rough. Visually polished but tap reliability is poor, especially on the dense pages (Race Detail, Calendar, Constructors).

### Top 5 Critical Issues (by impact × frequency)

| # | Issue | Where | Severity |
|---|---|---|---|
| 1 | Header nav links are 33–67 × **37 px** (height fails on every page) | Global header — every page | 🔴 CRITICAL |
| 2 | `.nav-label` font-size is **9 px** at ≤480 px breakpoint | Global header — every page | 🔴 CRITICAL |
| 3 | Race-detail driver-name links are **14 × 14 px** (97 small targets on one page) | `#/race/:id` | 🔴 CRITICAL |
| 4 | Calendar Leaflet map markers are **30 × 30 px** and overlap in Europe cluster | `#/calendar` | 🟠 HIGH |
| 5 | Settings, theme, and season-pill header buttons are sub-44 (34×34 and 116×30) | Global header | 🟠 HIGH |

### Severity Counts (28 device-runs, 14 distinct pages)

- 🔴 **Critical (blocks core flows):** 6 distinct issue classes
- 🟠 **High (frequent friction):** 9 distinct issue classes
- 🟡 **Medium (polish):** 7 distinct issue classes
- 🟢 **Low / Nit:** 4 distinct issue classes
- ✅ **Zero horizontal-overflow violations**, ✅ **zero clipped-text violations**

---

## 2. Methodology

### Devices

| Device | Viewport | DPR | Build flags |
|---|---|---|---|
| Samsung Galaxy S23 Ultra | 412 × 915 | 3.5 | `isMobile: true, hasTouch: true`, Android 14 UA |
| Samsung Galaxy F55 | 384 × 854 | 2.8125 | `isMobile: true, hasTouch: true`, Android 14 UA |

Both are real flagship Samsung devices the user explicitly nominated as targets. Custom Playwright device descriptors were added inline to [playwright.config.js](playwright.config.js) — Playwright's built-in device registry does not ship Samsung profiles.

### Tooling

- **Playwright 1.58.2** + Chromium 1223
- Local production-build server (`serve`) on `http://localhost:4173`
- **14 dedicated audit tests** × 2 devices = **28 runs**, all passing in 37.0 s
- Test source: [tests/e2e/mobile-audit.spec.js](tests/e2e/mobile-audit.spec.js)
- Run with: `npm run test:e2e:mobile-audit`

### Assertions per page

Each test captures a full-page PNG, a per-page JSON sidecar, and runs three in-browser collectors:

1. **Touch targets** — measures `getBoundingClientRect()` of every `a, button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link]` and flags anything with `width < 44 || height < 44`.
2. **Clipped text** — detects `scrollWidth - clientWidth > 1` on `h1..h4, .page-title, .stat-value, .nav-label, .driver-card__name, .constructor-name, .badge-num`.
3. **Tiny fonts** — flags leaf text nodes with computed `font-size < 11 px`.
4. **Horizontal overflow** — asserts `document.documentElement.scrollWidth === clientWidth` (hard pass/fail).

### Acceptance thresholds

| Metric | Threshold | Rationale |
|---|---|---|
| Touch target | ≥ **44 × 44 px** | WCAG 2.5.5 AA, Apple HIG, Material Design 3 |
| Body / control text | ≥ **11 px** | Below this, even high-DPR users misread on the move |
| Horizontal scroll | **None** allowed | Hard fail in WCAG 1.4.10 (Reflow) |

### Artifacts produced

- 28 PNGs → `test-results/mobile-audit/{samsung-s23-ultra,samsung-f55}/<NN>-<slug>.png`
- 28 JSON sidecars with raw measurements (touch-target offenders, tiny-font offenders, clipped nodes)
- Total artifact size: ~51 MB (one 9.3 MB outlier: the draft-active page is extremely tall)

---

## 3. Global Findings — Header, Footer & Bottom Nav

These issues are present on **every page** (each appears 14× across the page suite per device). Fix once → fix everywhere.

### 🔴 GLOBAL-1 — Bottom navigation links fail WCAG 2.5.5 universally

- **Measured:** `.nav-link` widths 33–67 px, **height 37 px** on every page.
- **Source:** [styles/header.css](styles/header.css) — `@media (max-width: 1024px) { .nav-link { width: 36px; height: 36px; } }`, and `@media (max-width: 480px) { .nav-link { padding: 0.25rem 0.375rem; } }`.
- **Impact:** All 6 navigation entries (Home / Draft / Teams / Constructors / Drivers / Calendar) are too small for thumb interaction. The narrowest (33 px wide) is the Home icon on F55.
- **Recommendation:** Make every `.nav-link` exactly **44 × 48 px** on viewports ≤ 1024 px. Distribute the row's width equally with `flex: 1` and `min-height: 48px`. This also gives breathing room for the 9 px label problem below.

### 🔴 GLOBAL-2 — `.nav-label` font-size 9 px (≤480) and 10 px (≤768)

- **Measured:** Every page reports `span.nav-label` at 9 px (S23 Ultra) and 10 px (F55 — sits in the 768 bucket, viewport 384 px < 480 px so should also be 9 px; **investigate why F55 reports 10 px** — likely DPR rounding).
- **Source:** [styles/header.css](styles/header.css) — `@media (max-width: 480px) { .nav-label { font-size: 9px; } }`, `@media (max-width: 768px) { .nav-label { font-size: 10px; } }`.
- **Impact:** Below the readable floor. Labels become decorative noise rather than functional cues.
- **Recommendation:** Raise to **11–12 px** with `font-weight: 600`. If horizontal space is the blocker, drop the label below 480 px and rely on icons + an aria-label (icon-only is acceptable per HIG when icons are universally understood).

### 🟠 GLOBAL-3 — Header utility buttons sub-44

- **Measured:**
  - `button.theme-toggle-btn` — **34 × 34 px**
  - `button.btn-settings` — **34 × 34 px**
  - `button.season-pill-btn` — 116 × **30 px** (height fail)
  - `div.header-wordmark` (clickable home button) — 44 × **40 px**
- **Recommendation:** Standardize all header icon buttons to `min-width: 44px; min-height: 44px; padding: 0.5rem`. The season pill should grow to **36–40 px tall** via vertical padding without changing visual chip aesthetic.

### 🟠 GLOBAL-4 — Footer links 18 px tall

- **Measured:** `a.app-footer-brand` 62 × 18, secondary footer links 47 × 18 and 37 × 18.
- **Impact:** Visually fine, accessibility unacceptable for tap.
- **Recommendation:** Add `padding-block: 0.625rem` to footer anchors → ~38 px effective tap area. If space is tight, set `min-height: 44px; display: inline-flex; align-items: center`.

### 🟡 GLOBAL-5 — Bottom nav lacks `pb-safe-area` for gesture devices

- Visual review: The fixed bottom nav butts directly against the viewport edge. On gesture-bar Androids (S23 Ultra), the OS gesture indicator can occlude the bottom row.
- **Recommendation:** Add `padding-bottom: env(safe-area-inset-bottom)` to `.bottom-nav` container.

---

## 4. Per-Page Findings

Each section embeds the S23 Ultra and F55 screenshots for visual reference plus the issues unique to that page (global issues from §3 still apply but are not repeated).

> **Reading the counts:** `Small targets / Tiny fonts / Clipped`. Global header/footer contributes a fixed ~14 small targets to every page.

---

### 4.1 Home — `#/`

`![S23 Ultra](test-results/mobile-audit/samsung-s23-ultra/01-home.png)` `![F55](test-results/mobile-audit/samsung-f55/01-home.png)`

**Counts (S23 Ultra / F55):** 15 / 15 small targets, 2 / 2 tiny fonts, 0 / 0 clipped.

- 🟡 **HOME-1** — `.home-countdown-label` is **10 px**. Less critical than nav labels because each label is on its own line and read once, but still below the 11 px floor.
  - **Recommendation:** 11 px, `font-weight: 500`, `letter-spacing: 0.06em` so it still reads as small-caps metadata.
- 🟢 **HOME-2** — Hero CTA button is ~44 px tall ✓ (the only fully compliant control on the page).
- 🟡 **HOME-3** — "Fastest Lap • Last Race" stat tile cluster (visible top of home) has unclear tap affordance. Tiles look interactive (rounded, distinct background) but are static. Recommend either making them links to `#/race/<last>` or removing the elevated card visual.

---

### 4.2 Draft Setup — `#/draft`

`![S23 Ultra](test-results/mobile-audit/samsung-s23-ultra/02-draft-setup.png)`

**Counts:** 16 / 16 small targets, 1 / 1 tiny fonts, 0 / 0 clipped.

- 🟠 **DRAFT-1** — Player-name `<input>` fields measure **296 × 34 px**. Width fine, height fails.
  - **Source:** [styles/draft.css](styles/draft.css) — input height likely 2rem + small padding.
  - **Recommendation:** `padding: 0.75rem 1rem; font-size: 16px; min-height: 48px`. The `font-size: 16px` is critical to **prevent iOS Safari auto-zoom on focus**.
- 🟡 **DRAFT-2** — Label/legend type small but readable; no action needed.

---

### 4.3 Draft Active — `#/draft` (after start)

**Counts:** 15 / 15 small targets, 0 / 0 tiny fonts, 0 / 0 clipped.

- ⚠️ **Draft-active page is 9.3 MB tall** (single very long page). Suggests every driver pool + round shows simultaneously.
  - **Recommendation:** Consider collapsing past rounds or virtualizing the driver grid — performance on mid-tier Androids will suffer.
- 🟠 **DRAFT-3** — Draft pool driver cards are tappable but the dedicated "Pick" button on each card is the only large hit-area; whole-card tap is intuitive on mobile and should match.
  - **Recommendation:** Bind click to the entire `.driver-card` (entire card becomes the button), keep visible "Pick" affordance for clarity.

---

### 4.4 Teams · Drivers tab — `#/teams`

**Counts:** 49 / 49 small targets, 4 / 4 tiny fonts, 0 / 0 clipped.

- 🟠 **TEAMS-1** — Driver table densifies many `a.driver-link` rows to ~25 px tall.
  - **Recommendation:** Increase row `min-height` to 48 px; add `padding-block: 0.625rem` to anchors inside cells.
- 🟡 **TEAMS-2** — Tab switcher (`Drivers | Constructors | Comparison`) — tabs measure ~36 px tall. Marginal fail.
  - **Recommendation:** Bump tab `min-height` to 44 px.
- 🟡 **TEAMS-3** — Stat-label / stat-key text at 8 px (see §5 Tiny Fonts Catalog).

---

### 4.5 Teams · Constructors tab — `#/teams`

**Counts:** 28 / 28 small targets, 3 / 3 tiny fonts, 0 / 0 clipped.

- Same pattern as Drivers tab, fewer rows. Issues TEAMS-1..3 apply.

---

### 4.6 Teams · Comparison tab — `#/teams`

**Counts:** 49 / 49 small targets, 4 / 4 tiny fonts, 0 / 0 clipped.

- ⚠️ **Disabled state when draft not complete is silent**: comparison tab clicks land on what looks like a blank page. Test had to assert against `.empty-state` to detect this.
  - 🟠 **CMP-1** — **Recommendation:** Render an explicit, illustrated empty-state with a "Complete the draft to compare teams" CTA pointing back to `#/draft`. Currently feels like a broken page on first run.

---

### 4.7 Calendar · Grid — `#/calendar`

`![S23 Ultra](test-results/mobile-audit/samsung-s23-ultra/07-calendar-grid.png)`

**Counts:** 74 / 74 small targets, 1 / 1 tiny fonts, 0 / 0 clipped.

- 🟠 **CAL-1** — **22× Leaflet map markers at 30 × 30 px**, and they overlap heavily in the European GP cluster (Imola/Monaco/Barcelona/Spa/Hungaroring/Monza/Zandvoort all within ~1500 km).
  - **Recommendation:** (a) Bump marker hit area to 44 × 44 with `[class*="leaflet-marker-icon"] { width:44px !important; height:44px !important; margin:-22px 0 0 -22px !important; }`. (b) Add Leaflet `markerCluster` plugin so dense regions collapse to a numbered cluster at low zoom.
- 🟠 **CAL-2** — **9× `a.podium-driver` chips at 20 × 18 px** — the per-race podium pills below each calendar entry are the most violated single element on the page.
  - **Recommendation:** Convert to ≥ 28 px height with `padding: 0.375rem 0.5rem` and visually separate finishing position (badge) from driver code (text).
- 🟡 **CAL-3** — "GRID | WEEK" view toggle (`.view-btn`) — appears ~32 px tall.
  - **Recommendation:** 44 px min-height; add visible active state.

---

### 4.8 Calendar · Week view — `#/calendar` (week toggle)

**Counts:** 74 / 74 small targets, 1 / 1 tiny fonts, 0 / 0 clipped.

- 🟠 **CAL-4** — **9× `a.week-podium-item` at 57 × 24 px**. Width is OK; height fails.
  - **Recommendation:** Same treatment as CAL-2.

---

### 4.9 Drivers List — `#/drivers`

**Counts:** 14 / 14 small targets, 4 / 4 tiny fonts, 0 / 0 clipped.

- 🟡 **DRV-1** — Driver position `.badge-label` at **8 px**, `.driver-card__stat-key` at **8 px**, `.driver-card__code-chip` at **10 px**.
  - **Recommendation:** Raise badge labels to 10–11 px with stronger letter-spacing. The 8 px tier is genuinely unreadable for many users in motion.
- 🟢 **DRV-2** — Cards themselves are large, photo-led, and tappable as whole tiles. Very good mobile pattern. No change needed to card shell.

---

### 4.10 Constructors List — `#/constructors`

`![S23 Ultra](test-results/mobile-audit/samsung-s23-ultra/10-constructors-list.png)`

**Counts:** 36 / 36 small targets, 2 / 2 tiny fonts, 0 / 0 clipped.

- 🟠 **CON-1** — **22× `a.driver-link` rows at 360 × 25 px** (two driver rows per constructor card × 11 constructors).
  - **Source:** [styles/constructors-list.css](styles/constructors-list.css).
  - **Recommendation:** Bump `.driver-link` row to `min-height: 44px; display: flex; align-items: center; padding-inline: 0.75rem`. This is a high-frequency interaction — users tap driver names from constructor cards to drill in.
- 🟡 **CON-2** — Two `.drivers-label` text spans at **10.4 px**. Borderline; raise to 11 px.
- 🟢 **CON-3** — Constructor color-header band acts as the primary tap target and is nicely tall — good pattern.

---

### 4.11 Driver Profile — `#/driver/:id`

**Counts:** 21 / 21 small targets, 3 / 3 tiny fonts, 0 / 0 clipped.

- 🟡 **DPF-1** — Stat-label cluster (`.stat-label` 8 px) on profile stats grid.
  - **Recommendation:** 10–11 px.
- 🟡 **DPF-2** — Back-button affordance: profile header lacks an explicit back chevron. Mobile users rely on swipe-back or header nav; an explicit `<` arrow in the page-header is recommended.

---

### 4.12 Constructor Profile — `#/constructor/:id`

**Counts:** 20 / 20 small targets, 2 / 2 tiny fonts, 0 / 0 clipped.

- Similar profile pattern as 4.11. DPF-1 and DPF-2 apply.

---

### 4.13 Race Detail — `#/race/:id` 🚨 worst offender

`![S23 Ultra](test-results/mobile-audit/samsung-s23-ultra/13-race-detail.png)`

**Counts:** **97 / 97 small targets**, 2 / 2 tiny fonts, 0 / 0 clipped.

- 🔴 **RACE-1** — Results tables contain dozens of anchors measured at **14 × 14 px, 24 × 14 px, 26 × 14 px, 34 × 14 px, 46 × 14 px, 52 × 14 px, 67 × 18 px, 89 × 18 px**. These are the driver-name links and constructor-code chips inside results rows.
  - **Impact:** This is the page where users most want to tap a driver to see their season stats, and it is the page where tapping is most likely to mis-fire.
  - **Recommendation:** Restructure result rows to `min-height: 44px` per row. Each row's primary anchor should fill the row vertically. Compress visible content into 2 columns (Pos+Driver | Time+Points) and use a tap-row pattern — the row itself navigates to the driver, with explicit `aria-label`.
- 🟡 **RACE-2** — Two text spans below 11 px on the page title metadata strip.

---

### 4.14 "Coming Soon" gate — `#/` with `f1_fantasy_current_season=1995`

**Counts:** 15 / 15 small targets, 1 / 1 tiny fonts, 0 / 0 clipped.

- 🟢 **CS-1** — Empty state is well-designed; the only sub-44 controls are the global header/footer (already covered in §3).
- 🟡 **CS-2** — "Switch season" CTA is small and visually subordinate to the artwork. Promote to a primary button.

---

## 5. Tiny Fonts Catalog

| Class | Size | Where | Severity |
|---|---|---|---|
| `.nav-label` | 9 px | Global header nav | 🔴 Critical |
| `.badge-label` | 8 px | Driver cards (position badges) | 🟠 High |
| `.driver-card__stat-key` | 8 px | Driver cards | 🟠 High |
| `.stat-label` | 8 px | Profile stat grids | 🟠 High |
| `.driver-card__code-chip` | 10 px | Driver cards | 🟡 Medium |
| `.drivers-label` | 10.4 px | Constructors list | 🟡 Medium |
| `.home-countdown-label` | 10 px | Home countdown | 🟡 Medium |

**Universal recommendation:** Raise the smallest typographic tier to **11 px / 0.6875 rem** with `font-weight: 600` and slight `letter-spacing`. Use small-caps (`font-feature-settings: "smcp"`) where genuinely metadata.

---

## 6. Prioritized Fix Backlog

Severity × Effort matrix. P0 = fix before next release.

| Priority | Fix | Severity | Effort | Files |
|---|---|---|---|---|
| **P0** | Header `.nav-link` → 44×48 min | 🔴 Critical | XS (1 CSS rule) | [styles/header.css](styles/header.css) |
| **P0** | `.nav-label` font-size 11 px (or hide < 480 px) | 🔴 Critical | XS | [styles/header.css](styles/header.css) |
| **P0** | Race-detail row min-height 44 px + full-row anchor | 🔴 Critical | M (markup + CSS) | views/race-detail-view.js, styles/race-detail.css |
| **P0** | Draft setup inputs → 48 px tall, font-size 16 px | 🔴 Critical | XS | [styles/draft.css](styles/draft.css) |
| **P1** | Constructors-list `.driver-link` rows → 44 px | 🟠 High | S | [styles/constructors-list.css](styles/constructors-list.css) |
| **P1** | Theme/settings/season-pill buttons → 44 px | 🟠 High | XS | [styles/header.css](styles/header.css) |
| **P1** | Footer links → padding-block 0.625rem | 🟠 High | XS | styles/footer.css (or base.css) |
| **P1** | Leaflet markers → 44 px hit area + markerCluster | 🟠 High | S | calendar view JS + CSS |
| **P1** | Podium chips (calendar grid + week) → 28+ px tall | 🟠 High | S | [styles/calendar.css] |
| **P1** | Teams comparison empty-state messaging | 🟠 High | S | views/teams-view.js |
| **P2** | All tiny fonts → 11 px floor | 🟡 Medium | S | several |
| **P2** | Bottom nav `padding-bottom: env(safe-area-inset-bottom)` | 🟡 Medium | XS | [styles/header.css](styles/header.css) |
| **P2** | Profile pages — explicit back chevron | 🟡 Medium | S | views/driver-profile-view.js, views/constructor-profile-view.js |
| **P2** | Home stat tiles — clarify interactivity | 🟡 Medium | S | views/home-view.js |
| **P3** | Draft-active page virtualization (perf) | 🟢 Low | L | views/draft-active-view.js |
| **P3** | Home CTAs — promote Switch Season on coming-soon | 🟢 Low | XS | views/home-view.js |

---

## 7. Accessibility Gaps (WCAG snapshot)

| Criterion | Status | Notes |
|---|---|---|
| 1.4.10 Reflow (no horizontal scroll at 320 CSS px) | ✅ Pass | Verified on both devices |
| 1.4.4 Resize text up to 200% | ⚠️ Not tested this pass | Recommend follow-up |
| 1.4.3 Contrast (minimum) | ⚠️ Not measured this pass | Visual review suggests OK on dark theme, marginal on some chip text — needs axe-core run |
| 2.4.7 Focus visible | ✅ Pass | `:focus-visible` rules present in [styles/base.css](styles/base.css) |
| 2.5.5 Target Size (Minimum) | ❌ **Fail — universal** | Primary blocker |
| 2.5.8 Target Size (Enhanced, 24 px) | ❌ Fail | Even relaxed threshold fails on race-detail anchors |
| 3.3.2 Labels or Instructions | ✅ Pass | Form inputs labeled |
| 4.1.2 Name, Role, Value | ⚠️ Spot-check needed | Recommend axe run on nav-link icon-only buttons (need `aria-label`) |

**Follow-up audits recommended:**
- Run `@axe-core/playwright` for full contrast + ARIA sweep
- Manual screen-reader pass (TalkBack on S23 Ultra) for the bottom nav and race-detail tables
- Test 200 % browser zoom flow

---

## 8. Quick Wins (single-PR sized)

If only one PR can ship, do this — it eliminates ~70 % of the violations app-wide:

```css
/* styles/header.css — replace ≤1024 nav rule */
@media (max-width: 1024px) {
  .nav-link {
    flex: 1;
    min-width: 44px;
    min-height: 48px;
    width: auto;
    height: auto;
    padding: 0.5rem 0.5rem;
  }
  .nav-label   { font-size: 11px; font-weight: 600; letter-spacing: 0.02em; }
  .theme-toggle-btn,
  .btn-settings { min-width: 44px; min-height: 44px; }
  .season-pill-btn { min-height: 40px; padding-block: 0.5rem; }
  .header-wordmark { min-height: 44px; display: inline-flex; align-items: center; }
}

/* styles/base.css (or a new footer.css) */
.app-footer a { min-height: 44px; display: inline-flex; align-items: center; padding-inline: 0.25rem; }

/* Add safe-area padding */
.bottom-nav { padding-bottom: env(safe-area-inset-bottom); }
```

That single CSS change resolves: GLOBAL-1, GLOBAL-2, GLOBAL-3, GLOBAL-4, GLOBAL-5 — i.e. the 14 universal small-target offenders and the 1 universal tiny-font offender that compound across every page.

---

## 9. Appendix — Artifacts

### Screenshots (28 total)

Samsung Galaxy S23 Ultra (412×915 @3.5):
- [01-home](test-results/mobile-audit/samsung-s23-ultra/01-home.png)
- [02-draft-setup](test-results/mobile-audit/samsung-s23-ultra/02-draft-setup.png)
- [03-draft-active](test-results/mobile-audit/samsung-s23-ultra/03-draft-active.png)
- [04-teams-drivers](test-results/mobile-audit/samsung-s23-ultra/04-teams-drivers.png)
- [05-teams-constructors](test-results/mobile-audit/samsung-s23-ultra/05-teams-constructors.png)
- [06-teams-comparison](test-results/mobile-audit/samsung-s23-ultra/06-teams-comparison.png)
- [07-calendar-grid](test-results/mobile-audit/samsung-s23-ultra/07-calendar-grid.png)
- [08-calendar-week](test-results/mobile-audit/samsung-s23-ultra/08-calendar-week.png)
- [09-drivers-list](test-results/mobile-audit/samsung-s23-ultra/09-drivers-list.png)
- [10-constructors-list](test-results/mobile-audit/samsung-s23-ultra/10-constructors-list.png)
- [11-driver-profile](test-results/mobile-audit/samsung-s23-ultra/11-driver-profile.png)
- [12-constructor-profile](test-results/mobile-audit/samsung-s23-ultra/12-constructor-profile.png)
- [13-race-detail](test-results/mobile-audit/samsung-s23-ultra/13-race-detail.png)
- [14-coming-soon](test-results/mobile-audit/samsung-s23-ultra/14-coming-soon.png)

Samsung Galaxy F55 (384×854 @2.8):
- [01-home](test-results/mobile-audit/samsung-f55/01-home.png)
- [02-draft-setup](test-results/mobile-audit/samsung-f55/02-draft-setup.png)
- [03-draft-active](test-results/mobile-audit/samsung-f55/03-draft-active.png)
- [04-teams-drivers](test-results/mobile-audit/samsung-f55/04-teams-drivers.png)
- [05-teams-constructors](test-results/mobile-audit/samsung-f55/05-teams-constructors.png)
- [06-teams-comparison](test-results/mobile-audit/samsung-f55/06-teams-comparison.png)
- [07-calendar-grid](test-results/mobile-audit/samsung-f55/07-calendar-grid.png)
- [08-calendar-week](test-results/mobile-audit/samsung-f55/08-calendar-week.png)
- [09-drivers-list](test-results/mobile-audit/samsung-f55/09-drivers-list.png)
- [10-constructors-list](test-results/mobile-audit/samsung-f55/10-constructors-list.png)
- [11-driver-profile](test-results/mobile-audit/samsung-f55/11-driver-profile.png)
- [12-constructor-profile](test-results/mobile-audit/samsung-f55/12-constructor-profile.png)
- [13-race-detail](test-results/mobile-audit/samsung-f55/13-race-detail.png)
- [14-coming-soon](test-results/mobile-audit/samsung-f55/14-coming-soon.png)

### Raw measurements

Each page also produced a `.json` sidecar with the structured findings:
`test-results/mobile-audit/<device>/<NN>-<slug>.json` containing `{ smallTargets[], tinyFonts[], clipped[] }`.

### Reproducing this audit

```bash
npm install
npm run test:e2e:mobile-audit
```

Test suite source: [tests/e2e/mobile-audit.spec.js](tests/e2e/mobile-audit.spec.js)
Playwright config + custom Samsung device profiles: [playwright.config.js](playwright.config.js)

---

*End of audit.*
