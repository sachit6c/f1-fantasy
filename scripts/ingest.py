#!/usr/bin/env python3
"""
F1 Data Ingestion Script

Downloads F1 season data from Jolpica API and saves to:
- Raw JSON snapshots (/data/snapshots/{season}/)
- Canonical CSVs (/data/canonical/)

Usage:
  python3 scripts/ingest.py 2025
"""

import sys
import json
import csv
import ssl
import urllib.request
from pathlib import Path

BASE_URL = 'https://api.jolpi.ca/ergast/f1'
PROJECT_ROOT = Path(__file__).parent.parent

def fetch_api(endpoint):
    """Fetch JSON from Jolpica API"""
    url = f"{BASE_URL}{endpoint}"
    print(f"  Fetching: {endpoint}")

    try:
        # Create SSL context that doesn't verify certificates
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(url, context=context) as response:
            return json.loads(response.read())
    except Exception as e:
        print(f"  ❌ Error fetching {endpoint}: {e}")
        raise

def save_snapshot(season, name, data):
    """Save JSON snapshot"""
    snapshot_dir = PROJECT_ROOT / 'data' / 'snapshots' / str(season)
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    filepath = snapshot_dir / f"{name}.json"
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"  ✓ Saved snapshot: {name}.json")

def save_csv(filename, rows, fieldnames):
    """Save CSV file"""
    filepath = PROJECT_ROOT / 'data' / 'canonical' / filename

    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✓ Saved CSV: {filename}")

def ingest(season):
    """Main ingestion function"""
    print(f"\n🏎️  F1 Data Ingestion Script")
    print(f"📅 Season: {season}\n")

    try:
        # Step 1: Calendar
        print("📥 Step 1: Fetching race calendar...")
        calendar_data = fetch_api(f"/{season}.json")
        races = calendar_data['MRData']['RaceTable']['Races']
        save_snapshot(season, 'calendar', calendar_data)
        print(f"  ✓ Found {len(races)} races\n")

        # Step 2: Drivers
        print("📥 Step 2: Fetching drivers...")
        drivers_data = fetch_api(f"/{season}/drivers.json?limit=100")
        drivers = drivers_data['MRData']['DriverTable']['Drivers']
        save_snapshot(season, 'drivers', drivers_data)
        print(f"  ✓ Found {len(drivers)} drivers\n")

        # Step 3: Constructors
        print("📥 Step 3: Fetching constructors...")
        constructors_data = fetch_api(f"/{season}/constructors.json")
        constructors = constructors_data['MRData']['ConstructorTable']['Constructors']
        save_snapshot(season, 'constructors', constructors_data)
        print(f"  ✓ Found {len(constructors)} constructors\n")

        # Step 4: Driver Standings
        print("📥 Step 4: Fetching driver standings...")
        standings_data = fetch_api(f"/{season}/driverStandings.json?limit=100")
        standings_list = standings_data['MRData']['StandingsTable']['StandingsLists']
        standings = standings_list[0]['DriverStandings'] if standings_list else []
        save_snapshot(season, 'driver_standings', standings_data)
        print(f"  ✓ Found {len(standings)} driver standings\n")

        # Step 5: Constructor Standings
        print("📥 Step 5: Fetching constructor standings...")
        const_standings_data = fetch_api(f"/{season}/constructorStandings.json")
        const_standings_list = const_standings_data['MRData']['StandingsTable']['StandingsLists']
        const_standings = const_standings_list[0]['ConstructorStandings'] if const_standings_list else []
        save_snapshot(season, 'constructor_standings', const_standings_data)
        print(f"  ✓ Found {len(const_standings)} constructor standings\n")

        # Convert to CSVs
        print("📝 Step 6: Creating CSV files...\n")

        # Drivers CSV
        drivers_rows = [{
            'driverId': d['driverId'],
            'permanentNumber': d.get('permanentNumber', ''),
            'code': d.get('code', ''),
            'givenName': d['givenName'],
            'familyName': d['familyName'],
            'dateOfBirth': d.get('dateOfBirth', ''),
            'nationality': d.get('nationality', ''),
            'url': d.get('url', '')
        } for d in drivers]
        save_csv(f'drivers_{season}.csv', drivers_rows,
                ['driverId', 'permanentNumber', 'code', 'givenName', 'familyName', 'dateOfBirth', 'nationality', 'url'])

        # Constructors CSV
        const_rows = [{
            'constructorId': c['constructorId'],
            'name': c['name'],
            'nationality': c.get('nationality', ''),
            'url': c.get('url', '')
        } for c in constructors]
        save_csv(f'constructors_{season}.csv', const_rows,
                ['constructorId', 'name', 'nationality', 'url'])

        # Races CSV
        races_rows = [{
            'season': r['season'],
            'round': r['round'],
            'raceName': r['raceName'],
            'circuitId': r['Circuit']['circuitId'],
            'circuitName': r['Circuit']['circuitName'],
            'locality': r['Circuit']['Location']['locality'],
            'country': r['Circuit']['Location']['country'],
            'lat': r['Circuit']['Location']['lat'],
            'long': r['Circuit']['Location']['long'],
            'date': r['date'],
            'time': r.get('time', '')
        } for r in races]
        save_csv(f'races_{season}.csv', races_rows,
                ['season', 'round', 'raceName', 'circuitId', 'circuitName', 'locality', 'country', 'lat', 'long', 'date', 'time'])

        # Driver Standings CSV
        standings_rows = [{
            'season': season,
            'position': s['position'],
            'driverId': s['Driver']['driverId'],
            'points': s['points'],
            'wins': s['wins'],
            'constructorId': s['Constructors'][0]['constructorId'] if s.get('Constructors') else ''
        } for s in standings]
        save_csv(f'driver_standings_{season}.csv', standings_rows,
                ['season', 'position', 'driverId', 'points', 'wins', 'constructorId'])

        # Constructor Standings CSV
        const_standings_rows = [{
            'season': season,
            'position': s['position'],
            'constructorId': s['Constructor']['constructorId'],
            'points': s['points'],
            'wins': s['wins']
        } for s in const_standings]
        save_csv(f'constructor_standings_{season}.csv', const_standings_rows,
                ['season', 'position', 'constructorId', 'points', 'wins'])

        print(f"\n✅ Ingestion complete!")
        print(f"\n📂 Data saved to:")
        print(f"   - Snapshots: /data/snapshots/{season}/")
        print(f"   - CSVs: /data/canonical/")
        print(f"\n💡 You can now manually edit CSV files to add corrections.")
        print(f"   Data will be loaded from CSV on next app startup.\n")

    except Exception as e:
        print(f"\n❌ Ingestion failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    season = sys.argv[1] if len(sys.argv) > 1 else 2025
    ingest(season)
