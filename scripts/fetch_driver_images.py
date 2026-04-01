#!/usr/bin/env python3
"""
Fetch real driver and constructor images from Wikipedia.
Downloads actual photos for all F1 drivers and constructor logos.
"""

import json
import csv
import urllib.request
import urllib.parse
import ssl
import os
import time
from pathlib import Path

# SSL workaround for macOS
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

BASE_DIR = Path(__file__).parent.parent
IMAGES_DIR = BASE_DIR / 'data' / 'images'
DRIVERS_DIR = IMAGES_DIR / 'drivers'
CONSTRUCTORS_DIR = IMAGES_DIR / 'constructors'

# Create directories
DRIVERS_DIR.mkdir(parents=True, exist_ok=True)
CONSTRUCTORS_DIR.mkdir(parents=True, exist_ok=True)

def fetch_wikipedia_image(wiki_url):
    """
    Extract image URL from Wikipedia page using multiple methods.
    Returns the best available image URL.
    """
    try:
        # Extract page title from Wikipedia URL
        page_title = wiki_url.split('/wiki/')[-1]
        
        # Method 1: Try REST API summary
        api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{page_title}"
        req = urllib.request.Request(api_url, headers={
            'User-Agent': 'F1FantasyLeague/1.0 (Educational Project)'
        })
        
        with urllib.request.urlopen(req, context=ssl_context) as response:
            data = json.loads(response.read())
            
            if 'thumbnail' in data and 'source' in data['thumbnail']:
                return data['thumbnail']['source']
            elif 'originalimage' in data and 'source' in data['originalimage']:
                return data['originalimage']['source']
        
        # Method 2: Try MediaWiki API to get page images
        query_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={page_title}&prop=pageimages&format=json&pithumbsize=500"
        req = urllib.request.Request(query_url, headers={
            'User-Agent': 'F1FantasyLeague/1.0 (Educational Project)'
        })
        
        with urllib.request.urlopen(req, context=ssl_context) as response:
            data = json.loads(response.read())
            pages = data.get('query', {}).get('pages', {})
            
            for page_id, page_data in pages.items():
                if 'thumbnail' in page_data:
                    return page_data['thumbnail']['source']
        
        print(f"  No image found for {page_title}")
        return None
                
    except Exception as e:
        print(f"  Error fetching image for {wiki_url}: {e}")
        return None

def download_image(image_url, output_path):
    """Download image from URL and save to output_path."""
    try:
        # Add delay to avoid rate limiting
        time.sleep(1.5)
        
        req = urllib.request.Request(image_url, headers={
            'User-Agent': 'F1FantasyLeague/1.0 (Educational Project)'
        })
        
        with urllib.request.urlopen(req, context=ssl_context) as response:
            image_data = response.read()
            
        with open(output_path, 'wb') as f:
            f.write(image_data)
            
        return True
    except Exception as e:
        print(f"  Error downloading {image_url}: {e}")
        return False

def fetch_driver_images():
    """Fetch images for all drivers from both seasons."""
    print("\nFetching driver images from Wikipedia...")
    
    # Track unique drivers by driverId
    drivers_seen = set()
    drivers_data = []
    
    # Auto-discover all seasons from canonical directory
    all_seasons = sorted(
        int(p.stem.split('_')[-1])
        for p in (BASE_DIR / 'data' / 'canonical').glob('drivers_*.csv')
        if p.stem.split('_')[-1].isdigit()
    )
    print(f"  Found seasons: {all_seasons}")
    for season in all_seasons:
        csv_path = BASE_DIR / 'data' / 'canonical' / f'drivers_{season}.csv'
        
        if not csv_path.exists():
            print(f"  Skipping {season} - no CSV found")
            continue
            
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                driver_id = row['driverId']
                if driver_id not in drivers_seen:
                    drivers_seen.add(driver_id)
                    drivers_data.append(row)
    
    print(f"  Found {len(drivers_data)} unique drivers")
    
    # Fetch images for each driver
    downloaded = 0
    skipped = 0
    for driver in drivers_data:
        driver_id = driver['driverId']
        family_name = driver.get('familyName', '').lower()
        given_name = driver.get('givenName', '').lower()
        wiki_url = driver.get('url', '')
        
        # Skip if image already exists
        existing = list(DRIVERS_DIR.glob(f'{driver_id}.*'))
        if existing and existing[0].suffix in ['.jpg', '.png']:
            print(f"  {driver_id}: Already have image, skipping")
            skipped += 1
            continue
        
        print(f"  {driver_id}: Fetching image...")
        
        image_url = None
        
        # Method 1: Try Wikipedia API
        if wiki_url:
            image_url = fetch_wikipedia_image(wiki_url)
        
        # Method 2: Try Official F1 website pattern (common for current drivers)
        if not image_url and family_name:
            # F1 website pattern: https://media.formula1.com/image/upload/f_auto,c_limit,w_960,q_auto/content/dam/fom-website/drivers/{YEAR}/{FamilyName}.jpg
            # Try multiple year patterns
            for year in [2026, 2025, 2024]:
                test_url = f"https://media.formula1.com/image/upload/f_auto,c_limit,w_960,q_auto/content/dam/fom-website/drivers/{year}/{family_name.title()}.jpg"
                try:
                    req = urllib.request.Request(test_url, headers={
                        'User-Agent': 'F1FantasyLeague/1.0 (Educational Project)'
                    })
                    with urllib.request.urlopen(req, context=ssl_context, timeout=5) as response:
                        if response.status == 200:
                            image_url = test_url
                            print(f"    Found on F1 website ({year})")
                            break
                except:
                    continue
        
        if not image_url:
            print(f"    ✗ No image found")
            continue
            
        # Determine file extension from URL
        url_lower = image_url.lower()
        if '.jpg' in url_lower or '.jpeg' in url_lower:
            ext = 'jpg'
        elif '.png' in url_lower:
            ext = 'png'
        elif '.svg' in url_lower:
            ext = 'svg'
        else:
            ext = 'jpg'  # Default
        
        # Download image
        output_path = DRIVERS_DIR / f'{driver_id}.{ext}'
        if download_image(image_url, output_path):
            print(f"    ✓ Saved to {output_path.name}")
            downloaded += 1
        else:
            print(f"    ✗ Failed to download")
    
    print(f"\n✓ Downloaded {downloaded} new driver images ({skipped} already existed)")

def fetch_constructor_images():
    """Fetch images for all constructors from both seasons."""
    print("\nFetching constructor images from Wikipedia...")
    
    # Track unique constructors
    constructors_seen = set()
    constructors_data = []
    
    # Auto-discover all seasons from canonical directory
    all_seasons = sorted(
        int(p.stem.split('_')[-1])
        for p in (BASE_DIR / 'data' / 'canonical').glob('constructors_*.csv')
        if p.stem.split('_')[-1].isdigit()
    )
    print(f"  Found seasons: {all_seasons}")
    for season in all_seasons:
        csv_path = BASE_DIR / 'data' / 'canonical' / f'constructors_{season}.csv'
        
        if not csv_path.exists():
            print(f"  Skipping {season} - no CSV found")
            continue
            
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                constructor_id = row['constructorId']
                if constructor_id not in constructors_seen:
                    constructors_seen.add(constructor_id)
                    constructors_data.append(row)
    
    print(f"  Found {len(constructors_data)} unique constructors")
    
    # Special case mappings for teams with tricky Wikipedia pages
    SPECIAL_WIKI_PAGES = {
        'alfa': 'Sauber_Motorsport',  # Alfa Romeo F1 Team used Sauber's structure
    }
    
    # Fetch images for each constructor
    downloaded = 0
    for constructor in constructors_data:
        constructor_id = constructor['constructorId']
        wiki_url = constructor.get('url', '')
        
        # Skip if already exists
        existing = list(CONSTRUCTORS_DIR.glob(f'{constructor_id}.*'))
        if existing and existing[0].suffix in ['.jpg', '.png', '.svg']:
            print(f"  {constructor_id}: Already have logo, skipping")
            continue
        
        if not wiki_url:
            print(f"  {constructor_id}: No Wikipedia URL")
            continue
            
        print(f"  {constructor_id}: Fetching from Wikipedia...")
        
        # Try special page mapping first
        image_url = None
        if constructor_id in SPECIAL_WIKI_PAGES:
            special_page = SPECIAL_WIKI_PAGES[constructor_id]
            special_url = f"https://en.wikipedia.org/wiki/{special_page}"
            print(f"    Trying alternative page: {special_page}")
            image_url = fetch_wikipedia_image(special_url)
        
        # Fall back to original URL
        if not image_url:
            image_url = fetch_wikipedia_image(wiki_url)
        
        if not image_url:
            continue
            
        # Determine file extension
        url_lower = image_url.lower()
        if '.jpg' in url_lower or '.jpeg' in url_lower:
            ext = 'jpg'
        elif '.png' in url_lower:
            ext = 'png'
        elif '.svg' in url_lower:
            ext = 'svg'
        else:
            ext = 'jpg'
        
        # Download image
        output_path = CONSTRUCTORS_DIR / f'{constructor_id}.{ext}'
        if download_image(image_url, output_path):
            print(f"    ✓ Saved to {output_path.name}")
            downloaded += 1
        else:
            print(f"    ✗ Failed to download")
    
    print(f"\n✓ Downloaded {downloaded} constructor images")

if __name__ == '__main__':
    print("=" * 60)
    print("F1 Image Fetcher - Real Photos from Wikipedia")
    print("=" * 60)
    
    fetch_driver_images()
    fetch_constructor_images()
    
    print("\n" + "=" * 60)
    print("✓ Image fetch complete!")
    print("=" * 60)
