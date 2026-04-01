# F1 Fantasy League - Quick Start Guide

## Application Status: ✅ READY TO RUN

The base application has been successfully created with the following components:

### Files Created (19 total):

**Core Application:**
- ✅ `index.html` - Entry point
- ✅ `app.js` - Application bootstrap

**Views (4 files):**
- ✅ `views/base-view.js` - Base view class
- ✅ `views/view-manager.js` - Hash-based routing
- ✅ `views/draft-view.js` - Draft UI (390 lines)
- ✅ `views/team-comparison-view.js` - Team comparison UI (396 lines)

**Business Logic (6 files):**
- ✅ `lib/draft-config.js` - Draft configuration constants
- ✅ `lib/draft-rules.js` - Snake/fixed draft logic
- ✅ `lib/draft-store.js` - State management with localStorage
- ✅ `lib/data-store.js` - Mock data (20 F1 drivers)
- ✅ `lib/fantasy-scoring-config.js` - Configurable scoring rules
- ✅ `lib/fantasy-scorer.js` - Driver-level scoring engine
- ✅ `lib/fantasy-team-scorer.js` - Team aggregation & comparison

**Styles (6 files):**
- ✅ `styles/reset.css` - CSS reset
- ✅ `styles/variables.css` - CSS custom properties (F1 red, gold, spacing)
- ✅ `styles/base.css` - Typography and layout
- ✅ `styles/components.css` - Reusable UI components
- ✅ `styles/draft.css` - Draft-specific styles
- ✅ `styles/team-comparison.css` - Team comparison styles

---

## How to Run

### Option 1: Python Simple Server (Recommended)

```bash
cd "/Users/sachitsharma/Desktop/My Projects/F1-fantasy-league-v2"
python3 -m http.server 8000
```

Then open: **http://localhost:8000**

### Option 2: Node.js http-server (if you have npx)

```bash
cd "/Users/sachitsharma/Desktop/My Projects/F1-fantasy-league-v2"
npx http-server -p 8000
```

Then open: **http://localhost:8000**

---

## Testing the Application

### 1. Draft Flow Test

**Expected behavior:**
1. App loads at `#/draft` route
2. See draft setup form with:
   - Player 1 Name input
   - Player 2 Name input
   - Roster Size (default: 5)
   - Draft Type (Snake/Fixed)
3. Click "Start Draft"
4. Draft interface shows:
   - Current pick indicator (alternates between players)
   - Player rosters (left panel, sticky)
   - Available drivers grid (right panel, 20 drivers)
   - Progress bar
5. Click any driver card to pick them
6. After all picks complete, see "Draft Complete" screen
7. Click "View Team Comparison" to navigate to `#/teams`

### 2. Team Comparison Test

**Expected behavior:**
1. See comparison dashboard with 4 sections:
   - **Season Standings**: Player cards with total points, race wins
   - **Driver Contributions**: Per-driver stats for each player
   - **Race-by-Race Breakdown**: Table showing who won each race
   - **Points Trend**: Cumulative points table across races
2. Export/Reset buttons at bottom

**Note:** Currently uses **mock data** (no real race results yet). Scores will be 0 until Phase 2 CSV data is loaded.

### 3. Persistence Test

**Expected behavior:**
1. Complete a draft
2. Refresh the page
3. Draft state should be preserved (loaded from localStorage)
4. You should see the "Draft Complete" screen with your rosters intact

---

## Current Limitations

**This is a Phase 5 implementation with mock data:**

1. **No real F1 data yet** - Only 20 mock drivers for testing
2. **Fantasy scores are 0** - No race results loaded (requires Phase 2 CSV implementation)
3. **Only 2 views** - Draft and Team Comparison (Phase 3 views not implemented):
   - No Calendar View
   - No Race Detail View
   - No Driver Profile View
   - No Constructor Profile View

---

## What Works Right Now

✅ Complete draft flow (setup → in-progress → complete)
✅ Snake draft algorithm (alternating picks with order reversal)
✅ Fixed draft algorithm (simple alternating)
✅ localStorage persistence
✅ Hash-based routing (`#/draft`, `#/teams`)
✅ Team comparison UI (all 4 sections render)
✅ Responsive design (mobile-friendly)
✅ Export team comparison JSON

---

## Next Steps (Future Phases)

To make the app fully functional, you'll need to:

**Phase 1-2: Load Real Data**
- Fetch F1 data from Jolpica API
- Convert to CSV format (seasons, circuits, drivers, races, results, qualifying, sprints)
- Update `lib/data-store.js` to read from CSV files

**Phase 3: Implement Other Views**
- Calendar View (`#/calendar`)
- Race Detail View (`#/race/:raceId`)
- Driver Profile View (`#/driver/:driverId`)
- Constructor Profile View (`#/constructor/:constructorId`)

**Phase 6+: Advanced Features**
- Live scoring updates
- Historical season support
- Custom scoring presets UI
- Draft history
- Statistical insights

---

## File Structure

```
F1-fantasy-league-v2/
├── index.html
├── app.js
├── lib/
│   ├── data-store.js (mock - 20 drivers)
│   ├── draft-config.js
│   ├── draft-rules.js
│   ├── draft-store.js
│   ├── fantasy-scoring-config.js
│   ├── fantasy-scorer.js
│   └── fantasy-team-scorer.js
├── views/
│   ├── base-view.js
│   ├── view-manager.js
│   ├── draft-view.js
│   └── team-comparison-view.js
└── styles/
    ├── reset.css
    ├── variables.css
    ├── base.css
    ├── components.css
    ├── draft.css
    └── team-comparison.css
```

---

## Troubleshooting

**Problem:** Blank page
- Solution: Check browser console for errors. Ensure you're running from a server (not `file://` protocol)

**Problem:** "Failed to fetch module"
- Solution: ES modules require a server. Use Python or npx http-server

**Problem:** Draft doesn't persist after refresh
- Solution: Check localStorage in browser DevTools (Application tab → Local Storage)

**Problem:** Scores show as 0
- Solution: Expected behavior - no race results data loaded yet (mock data only)

---

## Browser Console

Expected console output on successful load:

```
[App] Starting F1 Fantasy League...
[ViewManager] Initialized
[ViewManager] Navigating to: draft
[DraftView] Rendering view
[App] Application initialized
```

---

## Ready to Test!

Start the server and open http://localhost:8000 to begin testing the draft flow.
