#!/usr/bin/env python3
"""
Fetch qualifying results from Jolpica F1 API and create CSV files
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

def fetch_qualifying_results(season, round_num):
    """Fetch qualifying results for a specific race"""
    data = fetch_api(f"/{season}/{round_num}/qualifying.json")

    if not data or 'MRData' not in data:
        return None

    races = data['MRData']['RaceTable'].get('Races', [])
    if not races:
        return None

    return races[0]

def save_qualifying_results_csv(season, all_results, output_path):
    """Save qualifying results to CSV"""

    rows = []

    for race in all_results:
        round_num = race['round']
        circuit_id = race['Circuit']['circuitId']
        race_id = f"{season}_{round_num.zfill(2)}"

        for result in race.get('QualifyingResults', []):
            driver_id = result['Driver']['driverId']
            position = result.get('position', '')
            q1_time = result.get('Q1', '')
            q2_time = result.get('Q2', '')
            q3_time = result.get('Q3', '')

            rows.append({
                'season': season,
                'round': round_num,
                'raceId': race_id,
                'circuitId': circuit_id,
                'driverId': driver_id,
                'position': position,
                'q1': q1_time,
                'q2': q2_time,
                'q3': q3_time
            })

    # Write CSV
    fieldnames = ['season', 'round', 'raceId', 'circuitId', 'driverId', 'position', 'q1', 'q2', 'q3']

    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Saved {len(rows)} qualifying results to {output_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fetch_qualifying.py <season>")
        print("Example: python3 fetch_qualifying.py 2025")
        sys.exit(1)

    season = sys.argv[1]

    print(f"Fetching qualifying results for {season} season...")

    # Create output directory
    canonical_dir = f"data/canonical"
    os.makedirs(canonical_dir, exist_ok=True)

    # Fetch all qualifying results
    all_results = []

    for round_num in range(1, 25):  # Try up to 24 races
        race_data = fetch_qualifying_results(season, round_num)

        if race_data:
            print(f"✓ Round {round_num}: {race_data['raceName']}")
            all_results.append(race_data)
            time.sleep(0.5)  # Rate limiting
        else:
            print(f"✗ Round {round_num}: No qualifying data (season ended or not yet held)")
            break

    if not all_results:
        print(f"No qualifying results found for {season}")
        sys.exit(1)

    print(f"\nFound {len(all_results)} races with qualifying results")

    # Save qualifying results CSV
    output_file = f"{canonical_dir}/qualifying_{season}.csv"
    save_qualifying_results_csv(season, all_results, output_file)

    print(f"\n✅ Complete! Qualifying results saved to {output_file}")

if __name__ == "__main__":
    main()
