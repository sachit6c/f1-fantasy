#!/usr/bin/env python3
"""
Fetch all F1 driver images from ESPN
"""

import os
import re
import csv
import time
import urllib.request
import urllib.parse
import ssl
import subprocess

# Directories
DATA_DIR = "data/canonical"
IMAGES_DIR = "data/images/drivers"

# ESPN search and driver URL patterns
ESPN_SEARCH_URL = "https://www.espn.com/racing/driver/_/id/{id}/{slug}"
ESPN_IMAGE_PATTERN = r'https://a\.espncdn\.com/combiner/i\?img=/i/headshots/rpm/players/full/(\d+)\.png'

# Known ESPN driver IDs (some manually mapped)
KNOWN_ESPN_IDS = {
    'max_verstappen': 4331,
    'hamilton': 527,
    'leclerc': 5729,
    'sainz': 5730,
    'norris': 5731,
    'piastri': 5752,
    'alonso': 528,
    'stroll': 5728,
    'russell': 5746,
    'antonelli': None,  # Try to find
    'gasly': 5732,
    'ocon': 5733,
    'albon': 5734,
    'colapinto': None,
    'tsunoda': 5751,
    'lawson': None,
    'hulkenberg': 529,
    'bearman': None,
    'doohan': None,
    'hadjar': None,
    'bortoleto': None,
}

def create_espn_slug(given_name, family_name):
    """Create ESPN-style URL slug from driver name"""
    full_name = f"{given_name} {family_name}".lower()
    # Replace spaces with hyphens, remove special chars
    slug = re.sub(r'[^a-z0-9-]', '', full_name.replace(' ', '-'))
    return slug

def search_espn_for_driver(given_name, family_name):
    """Search ESPN to find driver ID"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    # Try ESPN search
    search_query = f"{given_name} {family_name} F1"
    search_url = f"https://www.espn.com/search/results?q={urllib.parse.quote(search_query)}"
    
    try:
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        # Look for driver profile links
        # Pattern: /racing/driver/_/id/XXXX/name-slug
        matches = re.findall(r'/racing/driver/_/id/(\d+)/([a-z0-9-]+)', html)
        if matches:
            driver_id = matches[0][0]
            print(f"    Found ESPN ID: {driver_id}")
            return int(driver_id)
    except Exception as e:
        print(f"    Search failed: {e}")
    
    return None

def download_driver_image(driver_id, espn_id, given_name, family_name):
    """Download driver image from ESPN"""
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    # Construct direct ESPN image URL
    # Pattern: https://a.espncdn.com/combiner/i?img=/i/headshots/rpm/players/full/{id}.png&w=350&h=254
    image_url = f"https://a.espncdn.com/combiner/i?img=/i/headshots/rpm/players/full/{espn_id}.png&w=350&h=254"
    
    print(f"  → Downloading: {image_url}")
    
    try:
        # Download image
        req = urllib.request.Request(image_url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
            image_data = response.read()
        
        # Save as temporary PNG
        temp_file = os.path.join(IMAGES_DIR, f"{driver_id}_temp.png")
        output_file = os.path.join(IMAGES_DIR, f"{driver_id}.jpg")
        
        with open(temp_file, 'wb') as f:
            f.write(image_data)
        
        # Convert to JPG
        subprocess.run(
            ['sips', '-s', 'format', 'jpeg', temp_file, '--out', output_file],
            check=True, 
            capture_output=True
        )
        os.remove(temp_file)
        
        # Get file size
        file_size = os.path.getsize(output_file)
        print(f"  ✓ Saved ({file_size} bytes)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def fetch_all_drivers():
    """Fetch images for all drivers from ESPN"""
    
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    # Read drivers from CSV
    drivers = []
    csv_file = os.path.join(DATA_DIR, "drivers_2025.csv")
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['code']:  # Only active drivers with codes
                drivers.append({
                    'id': row['driverId'],
                    'given_name': row['givenName'],
                    'family_name': row['familyName'],
                    'code': row['code']
                })
    
    print(f"Found {len(drivers)} active drivers\n")
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for i, driver in enumerate(drivers, 1):
        driver_id = driver['id']
        given_name = driver['given_name']
        family_name = driver['family_name']
        
        print(f"[{i}/{len(drivers)}] {given_name} {family_name} ({driver_id})")
        
        output_file = os.path.join(IMAGES_DIR, f"{driver_id}.jpg")
        
        # Skip if already exists
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            if file_size > 10000:  # Skip if file is reasonable size
                print(f"  ⊘ Already exists ({file_size} bytes)")
                skip_count += 1
                continue
        
        # Get ESPN ID
        espn_id = KNOWN_ESPN_IDS.get(driver_id)
        
        if espn_id is None:
            print(f"  Searching for ESPN ID...")
            espn_id = search_espn_for_driver(given_name, family_name)
            
            if espn_id:
                # Update known IDs
                KNOWN_ESPN_IDS[driver_id] = espn_id
        
        if espn_id is None:
            print(f"  ❌ Could not find ESPN ID")
            fail_count += 1
            time.sleep(0.5)
            continue
        
        # Download image
        success = download_driver_image(driver_id, espn_id, given_name, family_name)
        
        if success:
            success_count += 1
        else:
            fail_count += 1
        
        # Rate limiting
        time.sleep(1.5)
    
    print("\n" + "=" * 60)
    print(f"✅ Success: {success_count}")
    print(f"⊘ Skipped: {skip_count}")
    print(f"❌ Failed: {fail_count}")
    print("=" * 60)

if __name__ == "__main__":
    print("=" * 60)
    print("Fetching all F1 driver images from ESPN")
    print("=" * 60)
    print()
    
    fetch_all_drivers()
