#!/usr/bin/env python3
"""
Try multiple F1 APIs to fetch 2026 season data
"""

import urllib.request
import json
import ssl

def make_request(url, headers=None):
    """Make HTTP request with SSL handling"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    if headers is None:
        headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            data = response.read().decode('utf-8')
            try:
                return json.loads(data)
            except:
                return data
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return None

def try_openf1_api():
    """Try OpenF1 API - https://openf1.org/"""
    print("\n" + "=" * 60)
    print("1. Trying OpenF1 API (openf1.org)")
    print("=" * 60)
    
    # Check drivers
    url = "https://api.openf1.org/v1/drivers"
    print(f"Fetching: {url}")
    data = make_request(url)
    
    if data and isinstance(data, list):
        print(f"✓ Found {len(data)} drivers")
        
        # Get 2026 specific data
        drivers_2026 = [d for d in data if '2026' in str(d)]
        if drivers_2026:
            print(f"✓ Found {len(drivers_2026)} drivers for 2026")
            return drivers_2026
        else:
            print("  No 2026-specific data found")
            # Show sample
            if data:
                print(f"  Sample driver: {data[0] if data else 'None'}")
    
    return None

def try_jolpi_current():
    """Try Jolpi/Ergast for current/latest season"""
    print("\n" + "=" * 60)
    print("2. Trying Jolpi/Ergast API for latest season")
    print("=" * 60)
    
    url = "https://api.jolpi.ca/ergast/f1/current/drivers.json"
    print(f"Fetching: {url}")
    data = make_request(url)
    
    if data and isinstance(data, dict):
        drivers = data.get('MRData', {}).get('DriverTable', {}).get('Drivers', [])
        if drivers:
            print(f"✓ Found {len(drivers)} drivers in current season")
            for driver in drivers[:5]:
                print(f"  - {driver.get('givenName')} {driver.get('familyName')}")
            return drivers
    
    return None

def try_thesportsdb():
    """Try TheSportsDB API"""
    print("\n" + "=" * 60)
    print("3. Trying TheSportsDB API")
    print("=" * 60)
    
    # Search for F1 league
    url = "https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=Formula%201"
    print(f"Fetching: {url}")
    data = make_request(url)
    
    if data and isinstance(data, dict):
        teams = data.get('teams', [])
        if teams:
            print(f"✓ Found {len(teams)} F1 teams")
            for team in teams[:5]:
                print(f"  - {team.get('strTeam')}")
            return teams
    
    return None

def try_motorsport_stats():
    """Try motorsport-stats API"""
    print("\n" + "=" * 60)
    print("4. Trying Motorsport Stats")
    print("=" * 60)
    
    url = "https://www.motorsport-stats.com/api/formula1/seasons/2026"
    print(f"Fetching: {url}")
    data = make_request(url)
    
    if data:
        print(f"✓ Got response ({len(str(data))} bytes)")
        if isinstance(data, dict):
            print(f"  Keys: {list(data.keys())[:10]}")
            return data
    
    return None

def try_f1_calendar_api():
    """Try F1 Calendar API"""
    print("\n" + "=" * 60)
    print("5. Trying F1 Calendar API")
    print("=" * 60)
    
    url = "https://api.f1calendar.com/v1/seasons"
    print(f"Fetching: {url}")
    data = make_request(url)
    
    if data and isinstance(data, list):
        print(f"✓ Found {len(data)} seasons")
        
        # Check if 2026 is available
        seasons = [s for s in data if '2026' in str(s)]
        if seasons:
            print("✓ Found 2026 season data")
            return seasons
        else:
            print(f"  Latest season: {data[-1] if data else 'None'}")
    
    return None

def try_api_sports_f1():
    """Try API-Sports F1 endpoint (may require API key)"""
    print("\n" + "=" * 60)
    print("6. Trying API-Sports F1")
    print("=" * 60)
    
    # This usually requires an API key, but let's try
    url = "https://v1.formula-1.api-sports.io/rankings/drivers?season=2026"
    print(f"Fetching: {url}")
    data = make_request(url)
    
    if data:
        print(f"✓ Got response")
        if isinstance(data, dict):
            if 'errors' in data and data['errors']:
                print(f"  ⚠ API Error: {data.get('errors')}")
            else:
                return data
    
    return None

def main():
    print("=" * 60)
    print("Searching Multiple F1 APIs for 2026 Season Data")
    print("=" * 60)
    
    results = {}
    
    # Try each API
    apis = [
        ('openf1', try_openf1_api),
        ('jolpi_current', try_jolpi_current),
        ('thesportsdb', try_thesportsdb),
        ('motorsport_stats', try_motorsport_stats),
        ('f1_calendar', try_f1_calendar_api),
        ('api_sports', try_api_sports_f1),
    ]
    
    for api_name, api_func in apis:
        try:
            result = api_func()
            if result:
                results[api_name] = result
        except Exception as e:
            print(f"  ❌ Exception: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if results:
        print("\n✓ APIs with data:")
        for api_name in results.keys():
            print(f"  - {api_name}")
        
        # Save results
        with open('api_results_2026.json', 'w') as f:
            json.dump(results, f, indent=2)
        print("\n✓ Saved all results to api_results_2026.json")
    else:
        print("\n❌ No APIs returned 2026 data")
        print("\nRecommendation:")
        print("- 2026 season may not have started yet")
        print("- Most APIs update data after races begin")
        print("- Consider using official F1/Wikipedia sources for pre-season data")
    
    return results

if __name__ == "__main__":
    main()
