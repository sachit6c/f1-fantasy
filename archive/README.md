# Archive Folder

This folder contains non-essential files that are not part of the production application but were created during development.

## Folder Structure

### `/docs` - Old Documentation
- **PHASE*.md** - Planning documents from development phases
- **API_INTEGRATION_2025.md** - API integration notes
- **BUG_FIXES.md** - Bug fix documentation
- **LATEST_CHANGES.md** - Change logs

### `/test-files` - Debug & Test Files
- **debug.html** - Debugging test page
- **test.html**, **test.js** - Test files
- **verify-implementation.html** - Implementation verification page

### `/scraper-outputs` - One-Time Scraping Results
- **f1_teams_2026.html**, **wikipedia_2026_f1.html** - Scraped HTML
- **api_results_2026.json**, **current_standings.json** - API response samples
- **f1_teams_data.json** - Team data JSON
- **teams_section.txt** - Extracted text

### `/deprecated` - Old Code Versions
- **draft-view-old.js**, **draft-view-v2.js** - Previous draft view implementations
- **draft-old.css**, **draft-v2.css**, **draft-updates.css** - Old draft styles

## Why These Are Archived

These files are kept for historical reference but are not used by the application. They help track development history but would clutter the main codebase.

## Active Application Structure

The main application follows a year-wise structure:
- **Data**: Season-specific CSVs (`data/canonical/*_2025.csv`, `*_2026.csv`)
- **Stores**: Season-scoped data and draft management
- **Views**: All views respect the current season context

See main README.md for current application documentation.
