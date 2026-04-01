# PHASE 5 IMPLEMENTATION - SETUP & TESTING GUIDE

## Overview

Phase 5 adds fantasy scoring and team comparison capabilities to the F1 Fantasy League application. This implementation is **modular** and can work standalone or integrate with existing Phase 3/4 views.

---

## Prerequisites

Before testing Phase 5, ensure you have:

1. ✅ **Phase 2 Complete**: Data layer (`data-store.js`, `csv-loader.js`, `query-api.js`)
2. ✅ **Phase 3 Complete**: Base views (`base-view.js`, `view-manager.js`, view registration)
3. ✅ **Phase 4 Complete**: Draft mechanics (`draft-store.js`, `draft-view.js`)
4. ✅ **CSV Data**: At least some mock or real race results data

If any phase is incomplete, see "Minimal Testing Setup" below.

---

## Installation

### Step 1: Verify File Structure

Ensure these Phase 5 files exist:

```
/F1-fantasy-league-v2/
├── lib/
│   ├── fantasy-scoring-config.js    ✅
│   ├── fantasy-scorer.js            ✅
│   └── fantasy-team-scorer.js       ✅
├── views/
│   └── team-comparison-view.js      ✅
└── styles/
    └── team-comparison.css          ✅
```

### Step 2: Update `app.js`

Add TeamComparisonView registration:

```javascript
// app.js
import { dataStore } from './lib/data-store.js';
import { ViewManager } from './views/view-manager.js';
import { CalendarView } from './views/calendar-view.js';
import { RaceDetailView } from './views/race-detail-view.js';
import { DriverProfileView } from './views/driver-profile-view.js';
import { ConstructorProfileView } from './views/constructor-profile-view.js';
import { DraftView } from './views/draft-view.js';
import { TeamComparisonView } from './views/team-comparison-view.js';  // ← ADD THIS

async function init() {
  console.log('[App] Starting F1 Fantasy League...');

  try {
    // Load data
    console.log('[App] Loading CSV data...');
    await dataStore.load({ includeDerived: true });
    console.log('[App] Data loaded successfully');

    // Initialize view manager
    const viewManager = new ViewManager();

    // Register views
    viewManager.registerView('calendar', new CalendarView());
    viewManager.registerView('race', new RaceDetailView());
    viewManager.registerView('driver', new DriverProfileView());
    viewManager.registerView('constructor', new ConstructorProfileView());
    viewManager.registerView('draft', new DraftView());
    viewManager.registerView('teams', new TeamComparisonView());  // ← ADD THIS

    // Initialize routing
    viewManager.init();

    console.log('[App] Application initialized');

  } catch (err) {
    console.error('[App] Initialization failed:', err);

    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
      <div class="error-message">
        <p class="error-icon">⚠️</p>
        <p class="error-text">Failed to load application: ${err.message}</p>
        <p style="margin-top: 1rem;">Please check your data files and try again.</p>
      </div>
    `;
  }
}

// Start app
init();
```

### Step 3: Update `index.html`

Add CSS import in `<head>` section:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>F1 Fantasy League</title>

  <!-- CSS -->
  <link rel="stylesheet" href="styles/reset.css">
  <link rel="stylesheet" href="styles/variables.css">
  <link rel="stylesheet" href="styles/base.css">
  <link rel="stylesheet" href="styles/components.css">
  <link rel="stylesheet" href="styles/views.css">
  <link rel="stylesheet" href="styles/draft.css">
  <link rel="stylesheet" href="styles/team-comparison.css">  <!-- ← ADD THIS -->
</head>
<body>
  <div id="app">
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading F1 data...</p>
    </div>
  </div>

  <!-- Application JS -->
  <script type="module" src="app.js"></script>
</body>
</html>
```

---

## Running Locally

### Option 1: Local HTTP Server (Recommended)

```bash
# Navigate to project directory
cd /Users/sachitsharma/Desktop/My\ Projects/F1-fantasy-league-v2

# Start a local server (choose one):

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Then open: `http://localhost:8000`

### Option 2: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

---

## Testing Phase 5

### Test 1: View Team Comparison (Basic)

**Prerequisite**: Completed draft with 2 players

1. Navigate to draft: `#/draft`
2. Complete a draft (2 players, 5 drivers each)
3. Click "View Team Comparison" OR navigate to `#/teams`

**Expected**:
- Season Standings cards show both players
- Total points: 0 (if no races completed)
- "No completed races yet" message

---

### Test 2: Team Comparison with Mock Data

If you don't have CSV data yet, test with mock data:

**Create**: `data/canonical/race_results.csv` (minimal mock):

```csv
raceId,season,round,position,positionOrder,driverId,driverCode,driverNumber,constructorId,gridPosition,laps,points,status,timeMillis,fastestLapRank,fastestLapTime
2024_01,2024,1,1,1,max_verstappen,VER,1,red_bull,1,57,25,Finished,5309000,1,1:31.447
2024_01,2024,1,2,2,perez,PER,11,red_bull,2,57,18,Finished,5311234,3,1:31.789
2024_01,2024,1,3,3,sainz,SAI,55,ferrari,3,57,15,Finished,5313456,2,1:31.523
2024_01,2024,1,4,4,leclerc,LEC,16,ferrari,5,57,12,Finished,5315678,4,1:31.890
2024_01,2024,1,5,5,hamilton,HAM,44,mercedes,7,57,10,Finished,5317890,5,1:32.012
```

**Create**: `data/canonical/qualifying.csv` (minimal mock):

```csv
raceId,season,round,position,driverId,constructorId,Q1,Q2,Q3
2024_01,2024,1,1,max_verstappen,red_bull,1:29.179,1:28.918,1:28.997
2024_01,2024,1,2,perez,red_bull,1:29.234,1:29.001,1:29.045
2024_01,2024,1,3,sainz,ferrari,1:29.345,1:29.112,1:29.156
2024_01,2024,1,4,leclerc,ferrari,1:29.456,1:29.223,1:29.267
2024_01,2024,1,5,hamilton,mercedes,1:29.567,1:29.334,1:29.378
```

**Create**: `data/canonical/races.csv` (minimal mock):

```csv
raceId,season,round,raceName,circuitId,circuitName,locality,country,lat,long,date,time,hasSprint,classification
2024_01,2024,1,Bahrain Grand Prix,bahrain,Bahrain International Circuit,Sakhir,Bahrain,26.0325,50.5106,2024-03-02,15:00:00,false,official
```

Then update `dataStore.js` to mark race as having results:

```javascript
// In getSeasonCalendar() or similar, add:
race.hasResults = true;  // Force race to be counted as completed
```

**Now test**:
1. Complete draft with drivers: VER, PER, SAI, LEC, HAM
2. Navigate to `#/teams`

**Expected**:
- Season Standings show total points (based on scoring)
- Driver Contributions table shows each driver's points
- Race Breakdown shows Bahrain GP scores
- Example: If Player 1 has VER + PER, they score 25+5+2 (race+quali+fastest) + 18+3 = 53 points

---

### Test 3: Scoring Calculations

**Verify scoring logic**:

Open browser console and run:

```javascript
// Import scoring modules
import { fantasyScorer } from './lib/fantasy-scorer.js';
import { dataStore } from './lib/data-store.js';

// Score Verstappen at Bahrain
const score = fantasyScorer.scoreDriverRace('2024_01', 'max_verstappen', dataStore);
console.log('Verstappen score:', score);

// Expected output:
// {
//   total: 32,
//   breakdown: {
//     racePosition: 25,     // P1
//     qualifyingBonus: 5,   // Pole
//     fastestLap: 2,        // Fastest lap bonus
//     // ... rest 0
//   },
//   participated: true
// }
```

---

### Test 4: Export Results

1. Navigate to `#/teams` (with completed races)
2. Click "Export Results" button

**Expected**:
- Browser downloads `fantasy_league_2024.json`
- JSON contains player data, driver contributions, race breakdowns
- File is valid JSON (can be parsed)

---

### Test 5: Integration with Driver Profile

If you've integrated fantasy contribution:

1. Navigate to `#/driver/max_verstappen`
2. Scroll to "Fantasy Contribution" section

**Expected**:
- Shows "Drafted by: [Player Name]"
- Shows "Total Fantasy Points: +280" (or whatever total)

---

### Test 6: Integration with Race Detail

If you've integrated fantasy highlights:

1. Navigate to `#/race/2024_01`
2. Scroll to "Fantasy Highlights" section

**Expected**:
- Shows both players' scores for this race
- Shows winner and margin

---

## Scoring Reference

### Default Scoring Breakdown

**Race Positions**:
- P1: 25 pts
- P2: 18 pts
- P3: 15 pts
- P4-10: 12, 10, 8, 6, 4, 2, 1

**Qualifying Bonus**:
- Pole: +5 pts
- P2: +3 pts
- P3: +2 pts
- P4-5: +1 pt

**Bonuses**:
- Fastest Lap: +2 pts
- (Optional) Podium: +3 pts
- (Optional) Beat Teammate: +2 pts

**Penalties**:
- DNF: -5 pts
- Disqualified: -10 pts
- DNS: -3 pts

### Example Calculations

**Scenario 1: Dominant Win**
```
Driver: VER at Bahrain
- Race: P1 → 25 pts
- Quali: Pole → +5 pts
- Fastest Lap → +2 pts
Total: 32 pts
```

**Scenario 2: DNF**
```
Driver: LEC at Bahrain
- Race: DNF → 0 pts
- Quali: P5 → +1 pt
- DNF Penalty → -5 pts
Total: -4 pts
```

---

## Troubleshooting

### Issue: "No completed draft found"

**Solution**: Ensure you've completed a draft via `#/draft` first. Check localStorage has `f1_fantasy_draft` key.

```javascript
// In console:
JSON.parse(localStorage.getItem('f1_fantasy_draft'));
// Should return draft object with status: 'completed'
```

---

### Issue: "No completed races yet"

**Solution**:
1. Check `race_results.csv` exists and has data
2. Check `races.csv` has `classification=official` (not `scheduled`)
3. Verify dataStore marks race as `hasResults=true`

```javascript
// In console:
import { dataStore } from './lib/data-store.js';
const calendar = dataStore.getRacesBySeason(2024);
console.log(calendar.filter(r => r.hasResults));
// Should show races with results
```

---

### Issue: Scores are 0 for all drivers

**Solution**:
1. Verify `race_results.csv` has `position` and `points` columns populated
2. Check `qualifying.csv` exists (if qualifying bonus enabled)
3. Verify driverIds in results match driverIds in draft roster

```javascript
// In console:
import { fantasyScorer } from './lib/fantasy-scorer.js';
import { dataStore } from './lib/data-store.js';

const score = fantasyScorer.scoreDriverRace('2024_01', 'max_verstappen', dataStore);
console.log(score.breakdown);
// Check which fields are 0 vs expected values
```

---

### Issue: CSS not loading

**Solution**:
1. Verify `styles/team-comparison.css` exists
2. Check `index.html` has `<link>` tag for team-comparison.css
3. Check browser Network tab for 404 errors
4. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Development Tips

### Custom Scoring Presets

To test different scoring rules:

```javascript
// In console or modify fantasy-scoring-config.js:
import { FantasyScorer } from './lib/fantasy-scorer.js';
import { SCORING_PRESETS } from './lib/fantasy-scoring-config.js';

// High variance scoring
const highVarianceScorer = new FantasyScorer(SCORING_PRESETS.highVariance);
const score = highVarianceScorer.scoreDriverRace('2024_01', 'max_verstappen', dataStore);
console.log('High variance score:', score.total);

// Conservative scoring (no penalties)
const conservativeScorer = new FantasyScorer(SCORING_PRESETS.conservative);
const score2 = conservativeScorer.scoreDriverRace('2024_01', 'leclerc', dataStore);
console.log('Conservative score (DNF):', score2.total);  // Should be -4 vs 0
```

### Debug Mode

Add to `team-comparison-view.js`:

```javascript
// At top of render():
console.log('[TeamComparison] Draft:', draftStore.draft);
console.log('[TeamComparison] Comparison:', comparison);
```

### Inspect Scoring Breakdown

```javascript
// In console:
import { fantasyTeamScorer } from './lib/fantasy-team-scorer.js';
import { draftStore } from './lib/draft-store.js';
import { dataStore } from './lib/data-store.js';

const [p1, p2] = draftStore.draft.players;
const comparison = fantasyTeamScorer.compareTeams(p1.playerId, p2.playerId, draftStore, dataStore);

// Inspect per-race breakdown
comparison.raceComparisons.forEach(race => {
  console.log(`${race.raceName}: ${race.player1Total} vs ${race.player2Total}`);
});

// Inspect driver contributions
comparison.player1.drivers.forEach(driver => {
  console.log(`${driver.driverId}: ${driver.totalPoints} pts (${driver.avgPoints.toFixed(1)} avg)`);
});
```

---

## Next Steps

After verifying Phase 5 works:

1. **Generate Real CSV Data**: Use Phase 1 ingestion scripts to fetch real F1 data
2. **Complete a Full Season**: Test with 10+ races to see trends
3. **Integrate Optional Enhancements**: Add fantasy sections to driver/race views
4. **Customize Scoring**: Adjust `DEFAULT_FANTASY_SCORING` to your preferences
5. **Add More Features**: Implement Phase 6 (if defined)

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify all prerequisite files from Phase 2-4 exist
3. Ensure CSV data is properly formatted
4. Review `PHASE5_INTEGRATION_GUIDE.md` for integration steps
5. Check `PHASE5_FANTASY_SCORING.md` for design specifications

---

**Phase 5 Implementation Status**: ✅ COMPLETE

All core fantasy scoring functionality has been implemented. The system is ready for testing and integration.
