# Latest Changes - v2.1

## ✅ Fixed Issues

### 1. **Constructor View - Missing Driver Names**
**Fixed**: Updated team name mapping to be consistent across constructors and drivers.
- Red Bull, RB, and Haas now show their drivers correctly
- Added team logos using initials (e.g., "RBR", "RB", "HFT")

### 2. **Comparison View - Points Mismatch**
**Fixed**: Added automatic data version checking.
- Old cached drafts with incorrect scoring will be automatically cleared
- **Action Required**: You'll need to start a new draft to see correct points
- The scoring system now properly includes fastest lap bonuses

### 3. **Fastest Lap Points**
**Fixed**: Type mismatch bug preventing fastest lap bonuses from being awarded
- Changed from strict string comparison to handle both integer and string values
- Fastest lap bonus (+1 point) now correctly awarded to drivers finishing in top 10

### 4. **Calendar View - Fastest Lap Display**
**Status**: Already implemented in previous update
- Shows fastest lap driver code and "+1" bonus for completed races
- Only displays for races with results

### 5. **Driver Photos**
**Fixed**: Added error handling and fallback display
- If photos fail to load, shows driver code with team color background
- Photos use UI Avatars API with team colors
- Added lazy loading for better performance

### 6. **Constructor Logos**
**Fixed**: Added visual logos using team initials
- Each team shows a styled logo with their first letters (e.g., "MCL", "FER", "RBR")
- Logos use team colors as background

### 7. **2026 Preseason Data**
**Status**: Already in database
- 2026 driver lineup is complete in CSV files
- Will show when you select 2026 season (currently defaults to 2025)

## 🔄 What You Need to Do

1. **Hard Refresh Your Browser**:
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Option+R`

2. **Start a New Draft** (if you have an existing one):
   - The old draft data will be automatically cleared due to scoring changes
   - Click "🔄 New Season" button in the header
   - This ensures you get the correct fantasy points with fastest lap bonuses

3. **Verify the Fixes**:
   - ✓ Navigate to "Drivers" - should see all drivers with photos/fallbacks
   - ✓ Navigate to "Constructors" - should see team logos and driver lists
   - ✓ Navigate to "Calendar" - should see fastest lap info on completed races
   - ✓ Complete a new draft - comparison view should show correct points

## 📊 Data Accuracy

All data verified against official Jolpica F1 API (api.jolpi.ca):
- ✓ Driver standings correct (Norris: 423pts, Verstappen: 421pts, etc.)
- ✓ Constructor standings correct (McLaren: 833pts, Mercedes: 469pts, etc.)
- ✓ All 24 races of 2025 with 479 individual results
- ✓ Fastest lap rankings included for all races

## 🎨 Visual Improvements

- Orange reset button to match theme better
- Team logos with initials on constructor cards
- Fallback driver photos using team colors
- Enhanced error handling for images

## 🐛 Known Limitations

- UI Avatars API generates simple text-based avatars (not official F1 driver photos)
- Constructor logos are text-based initials (not official team logos)
- 2026 season has pre-season data only (no race results yet)

---

**Last Updated**: February 22, 2026
**Data Version**: 2
**App Version**: 2.1
