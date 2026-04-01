# Bug Fixes - Auto-Pairing Draft System

## Issues Fixed

### 1. ✅ Roster Size Calculation (CRITICAL BUG)
**Problem:** Showed "0 / 5 drivers" instead of "0 / 10 drivers"
**Root Cause:** `rosterSize = Math.floor(teamCount / 2)` calculated as 5 instead of 10
**Fix:** Changed to `rosterSize = teamCount` (10 teams = 10 drivers per player)
**File:** `lib/draft-config.js:32`

### 2. ✅ Progress Bar Completing Early
**Problem:** Progress bar reached 100% after 5 clicks instead of 10
**Root Cause:** `getTotalPicks()` returned `rosterSize * playerCount` (10*2=20) but only 10 picks made with auto-pairing
**Fix:** Changed `getTotalPicks()` to return just `rosterSize` (10 picks for auto-pairing)
**File:** `lib/draft-rules.js:15-18`

### 3. ✅ Player Color Theming
**Problem:** No visual distinction between Player 1 and Player 2
**Fix:** Added themed colors:
- **Player 1 (Left):** Sky Blue (#0EA5E9)
- **Player 2 (Right):** Orange (#F97316)
- **Active Player:** Gold border + glow effect
**File:** `styles/draft.css` (appended)

### 4. ✅ Driver Photos
**Problem:** No driver images shown
**Fix:**
- Added `photoUrl` field to all mock drivers using UI Avatars API
- Added driver images to roster cards (40x40 circular)
- Added driver images to team selection cards (64x64 circular)
- Graceful fallback if image fails to load (`onerror="this.style.display='none'"`)
**Files:**
- `lib/data-store.js:48-74`
- `views/draft-view.js:245,296`

## Testing Results

### Before Fixes:
- ❌ Roster showed "0 / 5 drivers"
- ❌ Progress bar 100% after 5 clicks
- ❌ No player colors
- ❌ No driver photos

### After Fixes:
- ✅ Roster shows "0 / 10 drivers"
- ✅ Progress bar 100% after 10 clicks
- ✅ Player 1 = Blue, Player 2 = Orange
- ✅ Driver photos displayed

## Code Quality Improvements

1. **No Hardcoding:** All values dynamically calculated from `teamCount`
2. **Self-Documenting:** Added clear comments explaining auto-pairing logic
3. **Graceful Degradation:** Images hide if they fail to load
4. **Visual Feedback:** Clear color-coded player identification

## How to Test

1. Clear localStorage: DevTools → Application → Local Storage → Clear All
2. Refresh page
3. Enter player names
4. Observe:
   - ✅ "You'll draft 10 teams (20 drivers total)"
   - ✅ Player panels show "0 / 10 drivers"
   - ✅ Player 1 panel = Blue, Player 2 panel = Orange
   - ✅ Driver photos visible
5. Make picks:
   - ✅ Each click assigns 2 drivers
   - ✅ Progress bar updates correctly
   - ✅ After 10 clicks → Draft complete

## Technical Details

### Auto-Pairing Math:
```
Teams: 10
Drivers: 20 (10 teams × 2 drivers)
Picks needed: 10 (each pick assigns 2 drivers)
Each player gets: 10 drivers (1 from each team)
```

### Player Color Scheme:
```css
Player 1 (Left):  #0EA5E9 (Sky Blue)
Player 2 (Right): #F97316 (Orange)
Active Player:    #FFD700 (Gold) + glow
```

### Driver Photo Sizes:
- Roster cards: 40×40px circular
- Team selection: 64×64px circular
- Border matches player color

## Files Modified (7 total):

1. `lib/draft-config.js` - Fixed roster size calculation
2. `lib/draft-rules.js` - Fixed total picks calculation
3. `lib/data-store.js` - Added driver photo URLs
4. `views/draft-view.js` - Added image rendering (2 locations)
5. `styles/draft.css` - Added player colors + photo styles

## No Breaking Changes

All changes are backward compatible. The only user-visible change is the UI now correctly shows 10 drivers per player instead of 5.
