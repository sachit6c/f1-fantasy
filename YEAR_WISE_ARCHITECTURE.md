# Year-Wise Architecture

## Overview

The F1 Fantasy League app is designed with a **year-wise (season-based) architecture** where all data, storage, and views are scoped to a specific Formula 1 season (e.g., 2025, 2026).

## Core Principles

### 1. **Data Layer** - Season-Suffixed Files

All canonical data files are year-suffixed to keep seasons completely separate:

```
data/canonical/
├── drivers_2025.csv           # 2025 season drivers
├── drivers_2026.csv           # 2026 season drivers
├── constructors_2025.csv
├── constructors_2026.csv
├── races_2025.csv
├── races_2026.csv
├── race_results_2025.csv
├── race_results_2026.csv
├── qualifying_2025.csv
├── qualifying_2026.csv
├── driver_standings_2025.csv
├── driver_standings_2026.csv
├── constructor_standings_2025.csv
└── constructor_standings_2026.csv
```

**Why?** This keeps historical data intact and allows switching between seasons without data conflicts.

### 2. **Storage Layer** - Season-Scoped Stores

#### DataStore (`lib/data-store.js`)
- Has a `season` property (defaults to 2026)
- Loads data for the current season only
- Can switch seasons via `setSeason(year)`
- Re-loads data when season changes

```javascript
dataStore.setSeason(2025);  // Switch to 2025 data
await dataStore.load();      // Load 2025 CSVs
```

#### DraftStore (`lib/draft-store.js`)
- Tracks `currentSeason` 
- Saves drafts with season-specific localStorage keys:
  - `f1_fantasy_draft_2025`
  - `f1_fantasy_draft_2026`
- Each season has its own independent draft

```javascript
draftStore.setCurrentSeason(2026);  // Switch to 2026
draftStore.loadDraft();              // Load 2026 draft
```

**Why?** Users can maintain separate fantasy teams for multiple seasons simultaneously.

### 3. **View Layer** - Season-Aware Components

All views follow this pattern on render:

```javascript
async render(container, params) {
  this.root = container;
  
  // Sync season from current season
  if (draftStore.currentSeason) {
    dataStore.setSeason(draftStore.currentSeason);
  }
  
  // Load season-specific data
  if (!dataStore.loaded) {
    await dataStore.load();
  }
  
  // Render with current season's data
  this.renderContent();
}
```

**All views are season-aware:**
- `calendar-view.js` - Shows races for current season
- `drivers-list-view.js` - Shows drivers competing in current season
- `constructors-list-view.js` - Shows teams for current season
- `driver-profile-view.js` - Shows driver stats for current season
- `constructor-profile-view.js` - Shows team stats for current season
- `race-detail-view.js` - Shows race results from current season
- `draft-view.js` - Creates draft for current season
- `team-comparison-view.js` - Compares fantasy teams within current season

**Why?** Users see data relevant to the season they're interested in, without mixing years.

### 4. **Season Switching** - Header Dropdown

The header component (`components/header.js`) provides a season dropdown:

```html
<select id="season-selector">
  <option value="2025">2025 Season</option>
  <option value="2026">2026 Season</option>
</select>
```

When changed:
1. Updates `draftStore.currentSeason`
2. Saves to localStorage (`f1_current_season`)
3. Reloads the page to refresh all data

**Why?** Provides intuitive season navigation throughout the app.

## Data Flow

```
User selects season (2025/2026)
    ↓
Header updates draftStore.currentSeason
    ↓
Page reload
    ↓
Views sync dataStore.season = draftStore.currentSeason
    ↓
dataStore loads CSVs: *_2025.csv or *_2026.csv
    ↓
draftStore loads: f1_fantasy_draft_2025 or f1_fantasy_draft_2026
    ↓
Views render with season-specific data
```

## Adding New Seasons

To support a new season (e.g., 2027):

1. **Fetch data:**
   ```bash
   python3 scripts/fetch_race_results.py 2027
   python3 scripts/fetch_qualifying.py 2027
   # Run other fetch scripts for drivers, constructors, etc.
   ```

2. **Data files created:**
   - `data/canonical/drivers_2027.csv`
   - `data/canonical/races_2027.csv`
   - `data/canonical/race_results_2027.csv`
   - etc.

3. **Update header dropdown:**
   ```javascript
   // In components/header.js
   <option value="2027">2027 Season</option>
   ```

4. **That's it!** The stores and views automatically work with the new season.

## Benefits of Year-Wise Architecture

✅ **Data Integrity** - Historical seasons remain unchanged  
✅ **Scalability** - Easy to add new seasons  
✅ **Multi-Season Support** - Users can maintain drafts across years  
✅ **Performance** - Only loads one season's data at a time  
✅ **Clarity** - Clear separation of concerns  
✅ **Maintainability** - Consistent patterns across codebase  

## File Organization

```
/
├── index.html                  # Entry point
├── app.js                      # Bootstrap
├── README.md                   # Main docs
├── QUICKSTART.md              # Quick start
├── YEAR_WISE_ARCHITECTURE.md  # This file
│
├── data/                       # YEAR-WISE DATA
│   ├── canonical/             # Season CSVs (*_YYYY.csv)
│   ├── derived/               # Computed data (if needed)
│   └── images/                # Driver/team images
│
├── lib/                        # SEASON-AWARE CORE
│   ├── data-store.js          # Loads data per season
│   ├── draft-store.js         # Manages drafts per season
│   ├── csv-loader.js          # Loads season CSVs
│   ├── ergast-api.js          # Fetches season data
│   └── ...
│
├── views/                      # SEASON-AWARE VIEWS
│   ├── base-view.js
│   ├── calendar-view.js       # Season-specific calendar
│   ├── driver-profile-view.js # Season-specific stats
│   └── ...
│
├── components/                 # UI components
│   └── header.js              # Includes season selector
│
├── styles/                     # CSS
│
├── scripts/                    # DATA FETCHING (per season)
│   ├── fetch_race_results.py  # python3 fetch_race_results.py <year>
│   ├── fetch_qualifying.py    # python3 fetch_qualifying.py <year>
│   └── ...
│
└── archive/                    # NON-ESSENTIAL FILES
    ├── docs/                  # Old documentation
    ├── test-files/            # Debug/test files
    ├── scraper-outputs/       # One-time outputs
    └── deprecated/            # Old code versions
```

## Summary

The F1 Fantasy League is **100% year-wise**:
- **Data**: Season-suffixed CSV files
- **Storage**: Season-scoped localStorage keys
- **Views**: Always synced to current season
- **Navigation**: Season dropdown for easy switching

This architecture ensures clean separation between seasons while maintaining flexibility to work with historical and future data.
