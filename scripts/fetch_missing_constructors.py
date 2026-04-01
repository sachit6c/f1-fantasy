#!/usr/bin/env python3
"""
Fetch ALL constructor logos from Official F1 website.
"""

import urllib.request
import ssl
import subprocess
from pathlib import Path

# SSL workaround for macOS
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

BASE_DIR = Path(__file__).parent.parent
CONSTRUCTORS_DIR = BASE_DIR / 'data' / 'images' / 'constructors'

# All constructors - map constructor_id to F1 official team name
ALL_CONSTRUCTORS = {
    'red_bull': 'red bull',
    'ferrari': 'ferrari',
    'mercedes': 'mercedes',
    'mclaren': 'mclaren',
    'aston_martin': 'aston martin',
    'alpine': 'alpine',
    'williams': 'williams',
    'rb': 'rb',
    'haas': 'haas',
    'sauber': 'alfa romeo',  # Sauber previously known as Alfa Romeo
    'audi': 'alfa romeo',  # Audi (replacing Sauber) - use Alfa Romeo logo as placeholder
    'cadillac': 'haas'  # Cadillac not yet on F1 official
}

def try_f1_official_logo(team_name):
    """Fetch team logo from F1 official website."""
    
    # F1 official team logos pattern - encode spaces as %20
    team_name_encoded = team_name.replace(' ', '%20')
    url = f"https://media.formula1.com/image/upload/f_auto,c_limit,w_960,q_auto/content/dam/fom-website/2018-redesign-assets/team%20logos/{team_name_encoded}.png"
    
    print(f"    {url}")
    
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'F1FantasyLeague/1.0 (Educational Project)'
        })
        with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
            if response.status == 200:
                return url
    except Exception as e:
        print(f"      ✗ {e}")
        return None
    
    return None

def download_and_convert(url, output_path):
    """Download image and convert to JPG using sips."""
    try:
        # Download to temp file
        temp_path = output_path.with_suffix('.png.tmp')
        
        req = urllib.request.Request(url, headers={
            'User-Agent': 'F1FantasyLeague/1.0 (Educational Project)'
        })
        
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            image_data = response.read()
            
        with open(temp_path, 'wb') as f:
            f.write(image_data)
        
        # Convert to JPG using sips
        result = subprocess.run(
            ['sips', '-s', 'format', 'jpeg', str(temp_path), '--out', str(output_path)],
            capture_output=True,
            text=True
        )
        
        # Clean up temp file
        temp_path.unlink()
        
        if result.returncode == 0:
            return True
        else:
            print(f"      Conversion failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"      Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Fetching ALL Constructor Logos from F1 Official")
    print("=" * 60)
    
    # Remove all existing logos
    print("\nRemoving old logos...")
    for old_logo in CONSTRUCTORS_DIR.glob('*.jpg'):
        old_logo.unlink()
        print(f"  Removed {old_logo.name}")
    
    downloaded = 0
    failed = []
    
    for team_id, team_name in ALL_CONSTRUCTORS.items():
        print(f"\n{team_id} ({team_name}):")
        
        output_path = CONSTRUCTORS_DIR / f'{team_id}.jpg'
        
        # Try to find logo
        logo_url = try_f1_official_logo(team_name)
        
        if logo_url:
            print(f"  ✓ Found!")
            print(f"    Downloading...")
            
            if download_and_convert(logo_url, output_path):
                print(f"    ✓ Saved to {output_path.name}")
                downloaded += 1
            else:
                print(f"    ✗ Failed to download/convert")
                failed.append(team_id)
        else:
            print(f"  ✗ No logo found")
            failed.append(team_id)
    
    print("\n" + "=" * 60)
    print(f"✓ Downloaded {downloaded}/{len(ALL_CONSTRUCTORS)} constructor logos")
    if failed:
        print(f"✗ Failed: {', '.join(failed)}")
    print("=" * 60)

if __name__ == '__main__':
    main()
