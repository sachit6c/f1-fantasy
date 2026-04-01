#!/usr/bin/env python3
"""
Fetch race results from Jolpica F1 API and create CSV files
"""

import json
import csv
import urllib.request
import ssl
import time
import sys
import os

def fetch_api(endpoint):
    """Fetch data from Jolpica API"""
    base_url = "https://api.jolpi.ca/ergast/f1"
    url = f"{base_url}{endpoint}"

    print(f"Fetching: {url}")

    try:
        # Create SSL context that doesn't verify certificates
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(url, context=context) as response:
            data = json.loads(response.read().decode())
            return data
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def fetch_race_results(season, round_num):
    """Fetch results for a specific race"""
    data = fetch_api(f"/{season}/{round_num}/results.json")

    if not data or 'MRData' not in data:
        return None

    races = data['MRData']['RaceTable'].get('Races', [])
    if not races:
        return None

    return races[0]


def fetch_fastest_lap_driver(season, round_num):
    """Fetch the driver who set the fastest lap for a race.
    The main results endpoint often omits FastestLap; this dedicated
    endpoint is more reliable."""
    data = fetch_api(f"/{season}/{round_num}/fastest/1/results.json")

    if not data or 'MRData' not in data:
        return None

    races = data['MRData']['RaceTable'].get('Races', [])
    if not races or not races[0].get('Results'):
        return None

    return races[0]['Results'][0]['Driver']['driverId']

def save_race_results_csv(season, all_results, fastest_lap_by_round, output_path):
    """Save race results to CSV"""

    rows = []

    for race in all_results:
        round_num = race['round']
        circuit_id = race['Circuit']['circuitId']
        fastest_lap_driver = fastest_lap_by_round.get(int(round_num))

        for result in race.get('Results', []):
            driver_id = result['Driver']['driverId']
            constructor_id = result['Constructor']['constructorId']
            position = result.get('position', '')
            grid = result.get('grid', '')
            points = result.get('points', '0')
            status = result.get('status', '')
            laps = result.get('laps', '')

            # Fastest lap rank: prefer data from the dedicated endpoint,
            # fall back to what the results payload provides
            fastest_lap_rank = ''
            if 'FastestLap' in result:
                fastest_lap_rank = result['FastestLap'].get('rank', '')
            elif fastest_lap_driver and driver_id == fastest_lap_driver:
                fastest_lap_rank = '1'

            rows.append({
                'season': season,
                'round': round_num,
                'circuitId': circuit_id,
                'driverId': driver_id,
                'constructorId': constructor_id,
                'position': position,
                'grid': grid,
                'points': points,
                'laps': laps,
                'status': status,
                'fastestLapRank': fastest_lap_rank
            })

    # Write CSV
    fieldnames = ['season', 'round', 'circuitId', 'driverId', 'constructorId', 'position', 'grid', 'points', 'laps', 'status', 'fastestLapRank']

    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Saved {len(rows)} results to {output_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fetch_race_results.py <season>")
        sys.exit(1)

    season = sys.argv[1]

    print(f"Fetching race results for {season} season...")

    # Create output directory
    canonical_dir = f"data/canonical"
    os.makedirs(canonical_dir, exist_ok=True)

    # Fetch all race results
    all_results = []

    for round_num in range(1, 25):  # Try up to 24 races
        race_data = fetch_race_results(season, round_num)

        if race_data:
            print(f"✓ Round {round_num}: {race_data['raceName']}")
            all_results.append(race_data)
            time.sleep(0.5)  # Rate limiting
        else:
            print(f"✗ Round {round_num}: No data (season ended)")
            break

    if not all_results:
        print(f"No race results found for {season}")
        sys.exit(1)

    print(f"\nFound {len(all_results)} races with results")

    # Fetch fastest lap driver for each round via dedicated endpoint
    print("\nFetching fastest lap data...")
    fastest_lap_by_round = {}
    for round_num in range(1, len(all_results) + 1):
        fl_driver = fetch_fastest_lap_driver(season, round_num)
        if fl_driver:
            fastest_lap_by_round[round_num] = fl_driver
            print(f"  Round {round_num}: fastest lap = {fl_driver}")
        else:
            print(f"  Round {round_num}: fastest lap not available")
        time.sleep(0.5)

    # Save race results CSV
    output_file = f"{canonical_dir}/race_results_{season}.csv"
    save_race_results_csv(season, all_results, fastest_lap_by_round, output_file)

    print(f"\n✅ Complete! Race results saved to {output_file}")

if __name__ == "__main__":
    main()
