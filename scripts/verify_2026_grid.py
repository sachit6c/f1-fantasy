#!/usr/bin/env python3
"""
Verify 2026 F1 grid using F1 API sources
"""

import urllib.request
import json
import ssl

def fetch_ergast_data(endpoint):
    """Fetch data from Ergast/Jolpi API"""
    url = f"https://api.jolpi.ca/ergast/f1{endpoint}"
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def verify_2026_grid():
    """Verify 2026 F1 grid data"""
    
    print("=" * 60)
    print("Checking 2026 F1 Grid from API")
    print("=" * 60)
    
    # Try to get 2026 driver standings (includes team assignments)
    print("\nFetching 2026 driver standings from Ergast API...")
    data = fetch_ergast_data("/2026/driverStandings.json?limit=100")
    
    if data and 'MRData' in data:
        standings_lists = data['MRData']['StandingsTable'].get('StandingsLists', [])
        
        if standings_lists:
            driver_standings = standings_lists[0].get('DriverStandings', [])
            
            if driver_standings:
                print(f"\n✓ Found {len(driver_standings)} drivers in 2026 standings\n")
                
                # Group by constructor
                teams = {}
                for standing in driver_standings:
                    driver = standing['Driver']
                    constructors = standing.get('Constructors', [])
                    
                    if constructors:
                        team = constructors[0]['constructorId']
                        driver_id = driver['driverId']
                        driver_name = f"{driver['givenName']} {driver['familyName']}"
                        
                        if team not in teams:
                            teams[team] = []
                        teams[team].append({
                            'id': driver_id,
                            'name': driver_name,
                            'position': standing['position']
                        })
                
                # Display teams
                print("2026 F1 Grid from API:")
                print("-" * 60)
                for team in sorted(teams.keys()):
                    drivers = teams[team]
                    driver_names = ', '.join([d['name'] for d in drivers])
                    print(f"{team:20s}: {driver_names}")
                
                return teams
            else:
                print("❌ No driver standings found for 2026")
        else:
            print("❌ No standings lists found for 2026")
    else:
        print("❌ 2026 data not available from Ergast API")
    
    # Try alternative - get current/latest season
    print("\n" + "=" * 60)
    print("Trying 2025 data (latest available)...")
    print("=" * 60)
    
    data = fetch_ergast_data("/2025/driverStandings.json?limit=100")
    
    if data and 'MRData' in data:
        standings_lists = data['MRData']['StandingsTable'].get('StandingsLists', [])
        
        if standings_lists:
            driver_standings = standings_lists[0].get('DriverStandings', [])
            print(f"\n✓ Found {len(driver_standings)} drivers in 2025\n")
    
    print("\n" + "=" * 60)
    print("Note: 2026 season hasn't started yet.")
    print("API data for 2026 may not be available.")
    print("Please verify team assignments from official F1 sources.")
    print("=" * 60)
    
    return None

if __name__ == "__main__":
    verify_2026_grid()
