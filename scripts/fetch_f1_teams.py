#!/usr/bin/env python3
"""
Fetch 2026 F1 team lineups from Formula1.com official website
"""

import urllib.request
import ssl
import re
import json

def fetch_f1_teams():
    """Fetch teams page from Formula1.com"""
    
    url = "https://www.formula1.com/en/teams"
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    print(f"Fetching: {url}")
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        print(f"✓ Page fetched ({len(html)} bytes)\n")
        
        # Save HTML for inspection
        with open('f1_teams_2026.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("✓ Saved HTML to f1_teams_2026.html\n")
        
        # Look for team and driver data
        # F1.com often uses JSON data embedded in the page or loaded via JavaScript
        
        # Try to find JSON data
        json_matches = re.findall(r'<script[^>]*>\s*(?:window\.__INITIAL_STATE__|var\s+\w+)\s*=\s*({.*?})\s*(?:</script>|;)', html, re.DOTALL)
        
        if json_matches:
            print(f"Found {len(json_matches)} potential JSON data blocks")
            for i, json_str in enumerate(json_matches[:3]):
                try:
                    data = json.loads(json_str)
                    print(f"\nJSON Block {i+1}:")
                    # Look for team or driver data
                    if 'teams' in str(data).lower() or 'drivers' in str(data).lower():
                        print("  Contains team/driver data")
                except:
                    pass
        
        # Extract team names and drivers from HTML structure
        teams_found = {}
        
        # Look for team cards or sections
        # Pattern: team name followed by driver names
        team_sections = re.findall(r'<[^>]*(?:team|constructor)[^>]*>.*?</(?:div|section|article)>', html, re.DOTALL | re.IGNORECASE)
        
        print(f"\nFound {len(team_sections)} potential team sections")
        
        # Look for driver-team associations
        # Common pattern: team name + driver names nearby
        
        # Known teams and drivers for 2026
        known_teams = {
            'red bull': ['verstappen', 'lawson', 'perez', 'tsunoda'],
            'ferrari': ['leclerc', 'hamilton'],
            'mercedes': ['russell', 'antonelli'],
            'mclaren': ['norris', 'piastri'],
            'aston martin': ['alonso', 'stroll'],
            'alpine': ['gasly', 'colapinto', 'doohan'],
            'haas': ['bearman', 'ocon'],
            'williams': ['sainz', 'albon'],
            'rb': ['tsunoda', 'hadjar', 'lawson'],
            'audi': ['bottas', 'hulkenberg', 'perez', 'bortoleto'],
            'cadillac': ['hulkenberg', 'lindblad', 'doohan'],
        }
        
        # Search HTML for team-driver combinations
        html_lower = html.lower()
        
        for team, potential_drivers in known_teams.items():
            # Find team mention
            team_positions = [m.start() for m in re.finditer(re.escape(team), html_lower)]
            
            if team_positions:
                # For each team position, look for drivers within ~5000 chars
                for pos in team_positions[:3]:  # Check first 3 mentions
                    context = html_lower[pos:pos+5000]
                    
                    found_drivers = []
                    for driver in potential_drivers:
                        if driver in context:
                            found_drivers.append(driver)
                    
                    if found_drivers and len(found_drivers) <= 2:
                        teams_found[team] = found_drivers
                        break
        
        if teams_found:
            print("\n" + "=" * 60)
            print("Teams and Drivers extracted from F1.com:")
            print("=" * 60)
            for team, drivers in sorted(teams_found.items()):
                print(f"{team:20s}: {', '.join(drivers)}")
            
            # Save as JSON
            with open('f1_teams_data.json', 'w') as f:
                json.dump(teams_found, f, indent=2)
            print("\n✓ Saved to f1_teams_data.json")
        else:
            print("\n❌ Could not extract team-driver data automatically")
            print("The page likely loads data via JavaScript")
        
        # Try to extract any structured data
        print("\n" + "=" * 60)
        print("Searching for structured driver data...")
        print("=" * 60)
        
        # Look for driver names in the HTML
        driver_pattern = r'(?:verstappen|hamilton|leclerc|norris|piastri|russell|alonso|sainz|perez|albon|gasly|ocon|stroll|tsunoda|lawson|bearman|antonelli|colapinto|hadjar|bortoleto|bottas|hulkenberg|lindblad|doohan)'
        
        driver_mentions = re.findall(driver_pattern, html_lower)
        if driver_mentions:
            from collections import Counter
            driver_counts = Counter(driver_mentions)
            print("\nDriver mentions found:")
            for driver, count in driver_counts.most_common(25):
                print(f"  {driver:15s}: {count} times")
        
        return teams_found
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("Fetching 2026 F1 Teams from Formula1.com")
    print("=" * 60)
    print()
    
    teams = fetch_f1_teams()
    
    print("\n" + "=" * 60)
    print("Please review f1_teams_2026.html to verify team lineups")
    print("=" * 60)
