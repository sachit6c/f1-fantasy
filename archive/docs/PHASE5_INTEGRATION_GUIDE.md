# PHASE 5 IMPLEMENTATION - INTEGRATION GUIDE

## Files Created

### Core Scoring Logic
1. `lib/fantasy-scoring-config.js` - Scoring configuration and presets
2. `lib/fantasy-scorer.js` - Driver-level scoring engine
3. `lib/fantasy-team-scorer.js` - Team aggregation and comparison

### Views
4. `views/team-comparison-view.js` - Team comparison UI

### Styles
5. `styles/team-comparison.css` - Team comparison styles

---

## Required Updates to Existing Files

### 1. Update `app.js`

Add TeamComparisonView registration:

```javascript
// Add import at top
import { TeamComparisonView } from './views/team-comparison-view.js';

// In init() function, after registering other views:
viewManager.registerView('teams', new TeamComparisonView());
```

---

### 2. Update `index.html`

Add CSS import in `<head>`:

```html
<link rel="stylesheet" href="styles/team-comparison.css">
```

---

### 3. Optional: Update `views/driver-profile-view.js`

Add fantasy contribution section (if driver is drafted):

```javascript
// Add imports at top
import { draftStore } from '../lib/draft-store.js';
import { fantasyTeamScorer } from '../lib/fantasy-team-scorer.js';

// Add method to DriverProfileView class:
renderFantasyContribution(driver) {
  if (!draftStore.draft || draftStore.draft.status !== 'completed') return;

  const player = draftStore.getPlayerWhoPickedDriver(driver.driverId);
  if (!player) return;

  const section = this.createElement('section', 'fantasy-contribution');
  const heading = this.createElement('h2', 'section-heading', 'Fantasy Contribution');
  section.appendChild(heading);

  const card = this.createElement('div', 'contribution-card');

  const draftedText = this.createElement('p', '', `Drafted by: ${player.name}`);
  card.appendChild(draftedText);

  // Calculate season contribution
  const playerScore = fantasyTeamScorer.scorePlayerSeason(player.playerId, draftStore, dataStore);
  const driverContribution = playerScore.races.reduce((total, race) => {
    const driverScore = race.drivers.find(d => d.driverId === driver.driverId);
    return total + (driverScore ? driverScore.total : 0);
  }, 0);

  const contributionPrefix = driverContribution >= 0 ? '+' : '';
  const contributionText = this.createElement('p', 'contribution-text',
    `Total Fantasy Points: ${contributionPrefix}${driverContribution}`
  );
  card.appendChild(contributionText);

  section.appendChild(card);
  this.root.appendChild(section);
}

// Call this method in render() after other sections:
// this.renderFantasyContribution(profile.driver);
```

---

### 4. Optional: Update `views/race-detail-view.js`

Add fantasy highlights section:

```javascript
// Add imports at top
import { draftStore } from '../lib/draft-store.js';
import { fantasyTeamScorer } from '../lib/fantasy-team-scorer.js';

// Add method to RaceDetailView class:
renderFantasyHighlights(raceId) {
  if (!draftStore.draft || draftStore.draft.status !== 'completed') return;

  const section = this.createElement('section', 'fantasy-highlights');
  const heading = this.createElement('h2', 'section-heading', 'Fantasy Highlights');
  section.appendChild(heading);

  const [player1, player2] = draftStore.draft.players;

  const p1Score = fantasyTeamScorer.scorePlayerRace(player1.playerId, raceId, draftStore, dataStore);
  const p2Score = fantasyTeamScorer.scorePlayerRace(player2.playerId, raceId, draftStore, dataStore);

  const winner = p1Score.total > p2Score.total ? player1.name :
                 p2Score.total > p1Score.total ? player2.name : 'Tie';
  const margin = Math.abs(p1Score.total - p2Score.total);

  const summary = this.createElement('div', 'fantasy-summary');
  summary.innerHTML = `
    <p><strong>${player1.name}:</strong> ${p1Score.total} points</p>
    <p><strong>${player2.name}:</strong> ${p2Score.total} points</p>
    <p class="fantasy-winner">Winner: ${winner}${winner !== 'Tie' ? ` (+${margin})` : ''}</p>
  `;

  section.appendChild(summary);
  this.root.appendChild(section);
}

// Call this method in render() after renderRaceResults():
// this.renderFantasyHighlights(raceId);
```

---

### 5. Optional: Update `views/draft-view.js`

Add "View Team Comparison" button in renderDraftComplete():

```javascript
// In renderDraftComplete() method, update the viewTeamsBtn:
const viewTeamsBtn = this.createElement('button', 'btn-primary', 'View Team Comparison');
viewTeamsBtn.addEventListener('click', () => {
  window.location.hash = '#/teams';
});

actions.appendChild(viewTeamsBtn);
```

---

## Minimal Working Implementation

If you want to test **ONLY** the team comparison view without integrating into existing views:

1. Create the 5 new files (already done)
2. Update `app.js` to register 'teams' view
3. Update `index.html` to include CSS
4. Navigate directly to `#/teams` after completing a draft

The team comparison view will work standalone with the draft data.

---

## Testing with Mock Data

If CSV data is not yet materialized, you can test with mock data by temporarily
modifying `dataStore.js` to return mock race results:

```javascript
// In dataStore.js, add method:
getRaceResults(raceId) {
  // Return mock data for testing
  if (raceId === '2024_01') {
    return [
      {
        raceId: '2024_01',
        driverId: 'max_verstappen',
        position: '1',
        positionOrder: 1,
        gridPosition: '1',
        laps: '57',
        points: '25',
        status: 'Finished',
        fastestLapRank: '1'
      },
      {
        raceId: '2024_01',
        driverId: 'leclerc',
        position: null,
        positionOrder: 18,
        gridPosition: '5',
        laps: '12',
        points: '0',
        status: 'Engine',
        fastestLapRank: null
      }
      // ... more drivers
    ];
  }
  return [];
}
```

---

## Navigation Flow

1. **Draft Flow**: `#/draft` → Complete draft → Click "View Team Comparison"
2. **Direct Access**: `#/teams` (if draft is completed)
3. **From Calendar**: `#/calendar` → (future: add "View Standings" button)
4. **Driver Profile**: `#/driver/{id}` → See fantasy contribution (if drafted)
5. **Race Detail**: `#/race/{id}` → See fantasy highlights (if draft complete)

---

## File Tree Summary

```
/F1-fantasy-league-v2/
├── lib/
│   ├── fantasy-scoring-config.js    ✅ NEW
│   ├── fantasy-scorer.js            ✅ NEW
│   ├── fantasy-team-scorer.js       ✅ NEW
│   ├── draft-config.js              (Phase 4)
│   ├── draft-rules.js               (Phase 4)
│   ├── draft-store.js               (Phase 4)
│   ├── csv-loader.js                (Phase 2)
│   ├── data-store.js                (Phase 2)
│   └── query-api.js                 (Phase 2)
├── views/
│   ├── team-comparison-view.js      ✅ NEW
│   ├── base-view.js                 (Phase 3)
│   ├── view-manager.js              (Phase 3)
│   ├── calendar-view.js             (Phase 3)
│   ├── race-detail-view.js          (Phase 3) - UPDATE OPTIONAL
│   ├── driver-profile-view.js       (Phase 3) - UPDATE OPTIONAL
│   ├── constructor-profile-view.js  (Phase 3)
│   └── draft-view.js                (Phase 4) - UPDATE OPTIONAL
├── styles/
│   ├── team-comparison.css          ✅ NEW
│   ├── reset.css                    (Phase 3)
│   ├── variables.css                (Phase 3)
│   ├── base.css                     (Phase 3)
│   ├── components.css               (Phase 3)
│   ├── views.css                    (Phase 3)
│   └── draft.css                    (Phase 4)
├── index.html                       ⚠️ UPDATE (add CSS link)
└── app.js                           ⚠️ UPDATE (register teams view)
```

Legend:
- ✅ NEW: Created in Phase 5
- ⚠️ UPDATE: Requires modification
- (Phase X): From previous phase

---

## Next Steps

1. **Implement Phase 3** (if not done): Create base-view.js, view-manager.js, etc.
2. **Implement Phase 4** (if not done): Create draft-store.js, draft-view.js, etc.
3. **Update app.js**: Register 'teams' view
4. **Update index.html**: Add team-comparison.css
5. **Test**: Complete a draft, navigate to #/teams
6. **Optional**: Add fantasy integration to driver/race views
