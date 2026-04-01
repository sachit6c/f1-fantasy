#!/usr/bin/env python3
"""
Fetch 2026 F1 grid from Wikipedia
"""

import urllib.request
import ssl
import re
import json

def fetch_wikipedia_2026_grid():
    """Fetch 2026 F1 season info from Wikipedia"""
    
    url = "https://en.wikipedia.org/wiki/2026_Formula_One_World_Championship"
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
    
    print(f"Fetching: {url}")
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        print(f"✓ Page fetched ({len(html)} bytes)\n")
        
        # Look for team and driver information
        # Wikipedia usually has tables with team entries
        
        # Pattern to find driver-team combinations
        # Look for rows in tables with driver names and team names
        
        teams_found = {}
        
        # Common F1 teams for 2026
        team_patterns = [
            'Red Bull', 'Ferrari', 'Mercedes', 'McLaren', 'Aston Martin',
            'Alpine', 'Haas', 'Williams', 'RB', 'Audi', 'Cadillac', 'Sauber'
        ]
        
        # Common F1 drivers
        driver_patterns = [
            'Verstappen', 'Hamilton', 'Leclerc', 'Norris', 'Piastri', 'Russell',
            'Alonso', 'Sainz', 'Pérez', 'Perez', 'Albon', 'Gasly', 'Ocon',
            'Stroll', 'Tsunoda', 'Lawson', 'Bearman', 'Antonelli', 'Colapinto',
            'Hadjar', 'Bortoleto', 'Bottas', 'Hülkenberg', 'Hulkenberg', 'Lindblad'
        ]
        
        print("Searching for team-driver combinations in Wikipedia...\n")
        
        # Look for table rows or list items
        lines = html.split('\n')
        
        for i, line in enumerate(lines):
            # Check if line contains team and driver info
            for team in team_patterns:
                if team.lower() in line.lower():
                    # Look in surrounding lines for driver names
                    context = ' '.join(lines[max(0, i-3):min(len(lines), i+4)])
                    
                    for driver in driver_patterns:
                        if driver.lower() in context.lower():
                            team_key = team.lower().replace(' ', '_')
                            if team_key not in teams_found:
                                teams_found[team_key] = []
                            
                            if driver not in teams_found[team_key]:
                                teams_found[team_key].append(driver)
        
        if teams_found:
            print("=" * 60)
            print("Teams and Drivers found on Wikipedia:")
            print("=" * 60)
            for team, drivers in sorted(teams_found.items()):
                if drivers:
                    print(f"{team:20s}: {', '.join(drivers)}")
            print()
        else:
            print("❌ Could not extract team-driver information automatically\n")
        
        # Save HTML for manual inspection
        with open('wikipedia_2026_f1.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("✓ Saved HTML to wikipedia_2026_f1.html for manual inspection")
        
        return teams_found
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("Fetching 2026 F1 Grid from Wikipedia")
    print("=" * 60)
    print()
    
    fetch_wikipedia_2026_grid()
    
    print("\n" + "=" * 60)
    print("Please verify the grid from official sources:")
    print("- https://www.formula1.com/")
    print("- https://en.wikipedia.org/wiki/2026_Formula_One_World_Championship")
    print("=" * 60)
