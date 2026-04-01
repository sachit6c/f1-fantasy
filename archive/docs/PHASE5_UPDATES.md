# Phase 5 Updates - Auto-Pairing Draft System

## Summary of Changes

Based on user feedback, the draft system has been completely redesigned with auto-pairing mechanics and a simplified UI.

## Key Changes

### 1. Auto-Pairing Mechanic ✅
- When a player picks a driver, their teammate is **automatically assigned** to the other player
- Each "pick" now assigns **both drivers from a team** (one to each player)
- **20 drivers = 10 picks** (not 20 picks)
- **22 drivers = 11 picks** (future-proof for 2026)

### 2. Simplified Setup ✅
- ❌ Removed roster size selector (auto-calculated as `teamCount / 2`)
- ❌ Removed draft type selector (always Snake draft)
- ✅ Only asks for Player 1 and Player 2 names
- ✅ Player names persist across sessions

### 3. New UI Layout ✅
- **Side-by-side player panels** (left and right)
- **Center draft area** with teams grouped together
- **Active player highlighted** with gold border and glow effect
- **Entire team card is clickable** (both drivers visible)
- **Visual feedback** when team is drafted (grayed out)

### 4. Improved UX ✅
- **One-time setup**: Enter names once, auto-loads next time
- **Auto-navigation**: Automatically goes to Team Comparison when draft completes
- **New Season button**: Clears everything including player names
- **Persistent player names**: Survives browser refresh

## Files Modified

### Core Logic (4 files):

**lib/data-store.js**
- Added `getDriversByTeam()` - groups drivers by team
- Added `getTeammate()` - finds a driver's teammate
- Added `getTeams()` - returns all unique teams
- Added `getTeamCount()` - returns number of teams

**lib/draft-store.js**
- Updated `makePick()` to auto-assign teammate to other player
- Added `savePlayerNames()` - persist names separately
- Added `loadPlayerNames()` - retrieve saved names
- Added `clearAll()` - new season (clears names + draft)

**lib/draft-config.js**
- Removed hardcoded `rosterSize`
- Added `createDraftConfig()` helper to auto-calculate roster size
- Draft type always 'snake' (removed option)

**lib/draft-rules.js**
- No changes needed (snake logic still applies to pick order)

### Views (2 files):

**views/draft-view.js** (COMPLETELY REWRITTEN)
- Simplified setup screen (names only)
- New 3-column layout (Player 1 | Draft Area | Player 2)
- Teams displayed grouped with both drivers visible
- Active player panel highlighted
- Auto-navigates to #/teams on completion
- Auto-loads saved player names
- Entire card clickable (removed separate button)

**views/team-comparison-view.js**
- Changed "Reset Season" to "New Season"
- Uses `clearAll()` instead of `clearDraft()`
- Reloads page after clearing

### Styles (1 file):

**styles/draft.css** (COMPLETELY REWRITTEN)
- New classes for 3-column layout
- Player panel styles with active state
- Team card grid layout
- Driver card styles (large for picking)
- Responsive breakpoints for mobile

## New User Flow

### First Time:
1. Open app → Setup screen
2. Enter Player 1 and Player 2 names
3. Click "Start Draft"
4. Names saved to localStorage
5. Draft begins immediately

### Subsequent Visits:
1. Open app → Draft loads automatically
2. If draft completed → Auto-navigates to Team Comparison
3. If draft in progress → Resume where left off

### Draft Process:
1. Player panels on left and right show rosters
2. Active player's panel highlighted with gold border
3. Center shows all 10 teams (2 drivers each)
4. Click any driver → Both teammates assigned (one each)
5. Team grays out after selection
6. After 10 picks → Auto-navigate to Team Comparison

### New Season:
1. Click "New Season" button (draft or comparison view)
2. Confirms with user
3. Clears all data including player names
4. Reloads app → Back to setup screen

## Testing Checklist

- [ ] First-time setup works (enter names)
- [ ] Names persist after refresh
- [ ] Draft shows side-by-side panels
- [ ] Active player panel highlighted
- [ ] Clicking driver assigns both teammates
- [ ] Teams group correctly (10 teams × 2 drivers)
- [ ] Draft completes after 10 picks
- [ ] Auto-navigates to Team Comparison
- [ ] "New Season" clears everything
- [ ] Mobile responsive layout works

## Technical Details

**Auto-Pairing Logic:**
```javascript
// When player picks a driver:
1. Get teammate using dataStore.getTeammate(driverId)
2. Create pick for current player
3. Create auto-pick for teammate (assigned to other player)
4. Add both drivers to respective rosters
5. Advance pick index by 1 (not 2!)
6. Check if draft complete (currentPickIndex >= teamCount)
```

**Roster Size Calculation:**
```javascript
const teamCount = dataStore.getTeamCount(); // 10 in 2025, 11+ in 2026
const rosterSize = Math.floor(teamCount / 2); // Each player gets half
```

**Pick Index vs Driver Count:**
- Previous: 20 picks for 20 drivers
- New: 10 picks for 20 drivers (auto-pairing)
- Future: 11 picks for 22 drivers (2026)

## Browser Storage

**localStorage keys:**
- `f1_fantasy_draft` - Current draft state
- `f1_fantasy_player_names` - Player names (persists across seasons)

**New Season clears both keys**
**Reset Draft clears only draft key**

## Backward Compatibility

Old draft data in localStorage is **incompatible** with new system. First load with new code will:
1. Try to load old draft
2. Fail validation (missing teammate picks)
3. Fall back to setup screen
4. User re-enters names and starts fresh

## Next Steps

After testing, users can proceed to:
- Phase 2: Load real F1 data from Jolpica API
- Phase 3: Implement other views (Calendar, Race Detail, Driver/Constructor Profiles)
- Phase 6+: Live scoring, historical seasons, etc.
