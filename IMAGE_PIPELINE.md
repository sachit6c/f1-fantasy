# Image Pipeline Documentation

## Overview
Driver photos and team logos are stored in `data/images/` and are automatically fetched when adding historical season data.

## Directory Structure
```
data/images/
├── drivers/          # Driver headshot photos
│   ├── alonso.jpg
│   ├── hamilton.jpg
│   └── ...
└── constructors/     # Team logos
    ├── ferrari.png
    ├── mercedes.png
    └── ...
```

## Automatic Image Fetching

### When Adding a New Historical Season

After running `scripts/ingest.py` to fetch season data, **always run the image fetcher**:

```bash
# 1. Fetch season data (drivers, constructors, races, standings)
python3 scripts/ingest.py

# 2. Fetch race results for the season
python3 scripts/fetch_race_results.py

# 3. Fetch qualifying data for the season
python3 scripts/fetch_qualifying.py

# 4. Fetch driver and team images ← IMPORTANT!
python3 scripts/fetch_driver_images.py
```

### How It Works

The `fetch_driver_images.py` script:

1. **Reads all season CSV files** (2022, 2025, 2026)
2. **Fetches driver photos** from:
   - Wikipedia API (primary source)
   - Official F1 website (fallback)
3. **Fetches team logos** from:
   - Wikipedia API

4. **Smart downloading**:
   - Skips images that already exist
   - Handles rate limiting with delays
   - Supports JPG, PNG, and SVG formats

### Image Sources

| Season | Drivers | Teams |
|--------|---------|-------|
| 2021 | 21 drivers | 10 teams (Alfa, AlphaTauri, Alpine, Aston Martin, Ferrari, Haas, McLaren, Mercedes, Red Bull, Williams) |
| 2022 | 22 drivers | 10 teams (Alfa, AlphaTauri, Alpine, Aston Martin, Ferrari, Haas, McLaren, Mercedes, Red Bull, Williams) |
| 2025 | 24 drivers | 10 teams |
| 2026 | 24 drivers | 12 teams (includes Audi, Cadillac) |

### Rate Limiting

Wikipedia has rate limits. If you see "429: Too many requests" errors:

```bash
# Wait 30 seconds and retry
sleep 30 && python3 scripts/fetch_driver_images.py
```

The script will only fetch missing images, so it's safe to run multiple times.

### Special Cases

Some teams require alternative Wikipedia pages for logo fetching:

- **Alfa Romeo** (`alfa`): Uses Sauber_Motorsport Wikipedia page (Alfa Romeo F1 Team was operated by Sauber)

These special mappings are handled automatically in `fetch_driver_images.py`.

## Verification

Check that all images exist for a season:

```bash
# Check 2022 drivers
for driver in $(cut -d',' -f1 data/canonical/drivers_2022.csv | tail -n +2); do
  if ls data/images/drivers/$driver.* 2>/dev/null | head -1 > /dev/null; then
    echo "✓ $driver"
  else
    echo "✗ $driver MISSING"
  fi
done

# Check 2022 constructors
for team in $(cut -d',' -f1 data/canonical/constructors_2022.csv | tail -n +2); do
  if ls data/images/constructors/$team.* 2>/dev/null | head -1 > /dev/null; then
    echo "✓ $team"
  else
    echo "✗ $team MISSING"
  fi
done
```

## Image Format Support

- **Driver photos**: JPG, PNG (preferred: JPG)
- **Team logos**: PNG, SVG, JPG (preferred: PNG/SVG for transparency)

The app checks for images in this order:
1. `{id}.jpg`
2. `{id}.png`
3. `{id}.svg`

If no image exists, the app falls back to SVG placeholders generated on-the-fly.

## Adding New Seasons

When adding a new historical season (e.g., 2024):

1. **Update `fetch_driver_images.py`**:
   ```python
   # Line ~104: Update season list
   for season in [2022, 2024, 2025, 2026]:  # Add 2024
   ```

2. **Run the full pipeline**:
   ```bash
   # Fetch all data including images
   python3 scripts/ingest.py
   python3 scripts/fetch_race_results.py
   python3 scripts/fetch_qualifying.py
   python3 scripts/fetch_driver_images.py  # Images automatically included
   ```

3. **Verify completeness** (see Verification section above)

## Image Quality

- **Driver photos**: ~330-960px width from Wikipedia/F1 website
- **Team logos**: High-quality PNGs/SVGs with transparent backgrounds
- **SVG fallbacks**: Clean, minimal design with team colors

## Troubleshooting

### No image found for driver
- Check if Wikipedia page exists
- Try different Wikipedia search terms
- Create SVG placeholder as fallback

### Rate limiting errors
- Wait 30-60 seconds between retries
- Script automatically adds 1.5s delay between requests

### Wrong image format
- Convert using ImageMagick: `convert image.png image.jpg`
- Prefer JPG for photos, PNG/SVG for logos

## Future Enhancements

- [ ] Cache Wikipedia lookups to avoid re-fetching
- [ ] Add official F1 API image endpoint support
- [ ] Automatic retry logic with exponential backoff
- [ ] Image quality verification and resizing
