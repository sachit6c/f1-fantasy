# F1 Fantasy League - 1v1 Head-to-Head

A two-player F1 fantasy game using vanilla JavaScript, HTML, CSS, and CSV-based storage.

## Overview

This is a deterministic, turn-based fantasy F1 league for **two players**. Players draft real F1 drivers, and scores are calculated based on actual race results.

**Technology Stack**:
- Vanilla JavaScript (ES6 modules)
- HTML5 + CSS3
- CSV files as database
- Static hosting (no backend)

**📅 Year-Wise Architecture**: The entire app is organized by season (2025, 2026, etc.) with separate data files, draft storage, and views per year. See [YEAR_WISE_ARCHITECTURE.md](YEAR_WISE_ARCHITECTURE.md) for details.

---

## Features

### ✅ Phase 1: F1 Data API Selection
- Primary: Jolpica (Ergast continuation)
- Fallback: OpenF1
- CSV-based storage with manual editability

### ✅ Phase 2: Data Model & Read Layer
- Canonical CSVs: races, drivers, teams, results, qualifying, sprint
- Derived CSVs: season summaries, performance deltas
- In-memory data store with indexed lookups
- Deterministic rebuild from raw JSON snapshots

### ✅ Phase 3: Read-Only Views
- Race calendar (past + upcoming)
- Race detail (qualifying + results + sprint)
- Driver profiles (career stats, season performance)
- Constructor profiles (team history)

### ✅ Phase 4: Turn-Based Draft
- Snake draft (alternating + reversing each round)
- Configurable roster size (default 5 drivers)
- localStorage persistence
- Undo/reset functionality

### ✅ Phase 5: Fantasy Scoring & Team Comparison
- Configurable scoring rules (position points, bonuses, penalties)
- Driver-level scoring with detailed breakdowns
- Team aggregation (sum of driver scores)
- Head-to-head comparison view
- Race-by-race analysis
- JSON export

---

## Project Structure

```
/F1-fantasy-league-v2/
├── index.html                       # Entry point
├── app.js                           # Application bootstrap
│
├── lib/                             # Core logic
│   ├── csv-loader.js               # CSV fetch + parse
│   ├── data-store.js               # In-memory data store
│   ├── query-api.js                # High-level queries
│   ├── validators.js               # Data validation
│   ├── draft-config.js             # Draft constants
│   ├── draft-rules.js              # Draft logic
│   ├── draft-store.js              # Draft state management
│   ├── fantasy-scoring-config.js   # Scoring rules
│   ├── fantasy-scorer.js           # Driver scoring
│   └── fantasy-team-scorer.js      # Team aggregation
│
├── views/                           # UI views
│   ├── base-view.js                # Base view class
│   ├── view-manager.js             # Routing
│   ├── calendar-view.js            # Race calendar
│   ├── race-detail-view.js         # Race details
│   ├── driver-profile-view.js      # Driver profiles
│   ├── constructor-profile-view.js # Team profiles
│   ├── draft-view.js               # Draft interface
│   └── team-comparison-view.js     # Fantasy comparison
│
├── styles/                          # CSS
│   ├── reset.css
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   ├── views.css
│   ├── draft.css
│   └── team-comparison.css
│
└── data/                            # CSV data
    ├── canonical/                   # Manually editable
    │   ├── seasons.csv
    │   ├── circuits.csv
    │   ├── drivers.csv
    │   ├── constructors.csv
    │   ├── driver_teams.csv
    │   ├── races.csv
    │   ├── qualifying.csv
    │   ├── race_results.csv
    │   └── sprint_results.csv
    ├── derived/                     # Auto-generated
    │   ├── driver_season_summary.csv
    │   ├── driver_career_summary.csv
    │   ├── constructor_season_summary.csv
    │   ├── race_performance_deltas.csv
    │   └── qualifying_performance.csv
    └── snapshots/                   # Raw API responses
        └── {season}/
            └── *.json
```

---

## Quick Start

### Prerequisites

- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Local HTTP server (Python, Node.js, or VS Code Live Server)

### Setup

```bash
# Clone or download the project
cd F1-fantasy-league-v2

# Start local server (choose one):

# Python 3
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# VS Code: Install Live Server extension and right-click index.html
```

Open: `http://localhost:8000`

---

## Usage

### 1. Draft Phase

Navigate to `#/draft`:

1. **Setup**:
   - Enter player names (e.g., "Alice" and "Bob")
   - Choose roster size (default: 5 drivers)
   - Select draft type: Snake (recommended) or Fixed
   - Choose season (default: current year)

2. **Draft**:
   - Players alternate picking drivers
   - Snake draft reverses order each round (1-2, 2-1, 1-2...)
   - Search/filter available drivers
   - Cannot pick same driver twice

3. **Complete**:
   - When all rosters are full, draft ends
   - Click "View Team Comparison" to see scores

### 2. Fantasy Scoring

Navigate to `#/teams`:

- **Season Standings**: Total points, race wins, average per race
- **Driver Contributions**: Each driver's point contribution
- **Race Breakdown**: Winner and margin for each race
- **Points Trend**: Cumulative points over time

### 3. Exploration

- **Calendar** (`#/calendar`): View all races (past + upcoming)
- **Race Detail** (`#/race/{id}`): Qualifying + results + sprint
- **Driver Profile** (`#/driver/{id}`): Stats + fantasy contribution
- **Team Profile** (`#/constructor/{id}`): Season history

---

## Scoring System

### Default Rules

**Race Position Points**:
```
P1: 25 pts | P2: 18 pts | P3: 15 pts
P4: 12 pts | P5: 10 pts | P6: 8 pts
P7: 6 pts  | P8: 4 pts  | P9: 2 pts | P10: 1 pt
```

**Qualifying Bonus**:
```
Pole: +5 pts | P2: +3 pts | P3: +2 pts | P4-5: +1 pt
```

**Sprint Points**:
```
P1: 8 pts | P2: 7 pts | P3-8: 6,5,4,3,2,1 pts
```

**Bonuses**:
- Fastest Lap: +2 pts
- (Optional) Podium: +3 pts
- (Optional) Beat Teammate: +2 pts

**Penalties**:
- DNF: -5 pts
- Disqualified: -10 pts
- DNS: -3 pts

### Customization

Edit `lib/fantasy-scoring-config.js` to change rules.

---

## Data Management

### CSV Files

**Canonical** (manually editable):
- Edit to apply penalties, corrections
- Changes automatically reflected in scoring
- Track via Git for audit trail

**Derived** (auto-generated):
- Delete and rebuild anytime
- Computed from canonical sources
- Stored for performance

### Ingestion

#### Fetching Complete Season Data

When adding a historical season (e.g., 2022), run the complete pipeline in order:

```bash
# 1. Fetch basic season data (drivers, constructors, races, standings)
python3 scripts/ingest.py

# 2. Fetch race results
python3 scripts/fetch_race_results.py

# 3. Fetch qualifying data
python3 scripts/fetch_qualifying.py

# 4. Fetch driver photos and team logos
python3 scripts/fetch_driver_images.py
```

**Data Stored:**
- Canonical CSVs: `data/canonical/*_YYYY.csv` (drivers, constructors, races, etc.)
- Raw JSON: `data/snapshots/YYYY/*.json`
- Images: `data/images/drivers/*.jpg`, `data/images/constructors/*.png`

**Season Support:**
- 2021: 22 races, 21 drivers, 10 teams ✅
- 2022: 22 races, 22 drivers, 10 teams ✅
- 2025: 24 races, 24 drivers, 10 teams ✅
- 2026: 24 races, 24 drivers, 12 teams ✅

For detailed image pipeline documentation, see [IMAGE_PIPELINE.md](IMAGE_PIPELINE.md).

### Manual Corrections

1. Edit CSV file (e.g., apply post-race penalty)
2. Log change in `manual_corrections.csv`
3. Commit to Git
4. Scores recompute on next page load

---

## Development

### Adding New Features

1. **New Scoring Rule**:
   - Edit `lib/fantasy-scoring-config.js`
   - Update `FantasyScorer.scoreDriverRace()` if needed
   - No UI changes required

2. **New View**:
   - Create `views/my-view.js` extending `BaseView`
   - Register in `app.js`: `viewManager.registerView('myview', new MyView())`
   - Add route: `#/myview`

3. **New CSV Entity**:
   - Define schema in `PHASE2_DATA_MODEL.md`
   - Add to `data-store.js` loading logic
   - Create indexes for fast lookup

### Testing

Run validation:
```bash
node scripts/validate.js
```

Checks:
- Primary key uniqueness
- Foreign key integrity
- Enum value validity
- Missing mandatory columns

---

## Documentation

- `PHASE1_API_EVALUATION.md` - API selection process
- `PHASE2_DATA_MODEL.md` - CSV schemas and read layer
- `PHASE3_READ_ONLY_VIEWS.md` - UI view specifications
- `PHASE4_DRAFT_MECHANICS.md` - Draft system design
- `PHASE5_FANTASY_SCORING.md` - Scoring system design
- `PHASE5_INTEGRATION_GUIDE.md` - Integration instructions
- `PHASE5_SETUP_GUIDE.md` - Testing guide
- `PHASE5_IMPLEMENTATION_SUMMARY.md` - Implementation details

---

## Browser Compatibility

Requires:
- ES6 modules
- localStorage API
- CSS Grid
- Fetch API

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Not supported:
- Internet Explorer

---

## Known Limitations

1. **Two Players Only**: Designed for 1v1 head-to-head
2. **No Live Updates**: Manual page refresh required
3. **No Multi-League**: One draft per browser (localStorage)
4. **Browser-Only**: No native mobile app
5. **No Backend**: Static hosting only (no multiplayer sync)

These are design constraints, not bugs.

---

## Future Enhancements

- Live race result polling
- Canvas/SVG charts for visualizations
- Multiple concurrent leagues
- Trade/waiver system
- Mobile PWA
- Social features (leaderboards, comments)

---

## License

This is a hobby project. Use freely.

---

## Contact

For questions or issues, review documentation in `/docs` or check inline comments in source code.

---

**Status**: ✅ Phases 1-5 Complete

**Version**: 1.0.0

**Last Updated**: 2024
