#!/usr/bin/env python3
"""
Fetch all F1 driver images from Motorsport.com
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

# Motorsport.com drivers page
MOTORSPORT_URL = "https://www.motorsport.com/f1/drivers/"

def fetch_motorsport_page():
    """Fetch the Motorsport.com F1 drivers page"""
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    print(f"Fetching: {MOTORSPORT_URL}")
    
    try:
        req = urllib.request.Request(MOTORSPORT_URL, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        print(f"✓ Page fetched ({len(html)} bytes)\n")
        return html
        
    except Exception as e:
        print(f"❌ Error fetching page: {e}")
        return None

def extract_driver_images(html):
    """Extract driver names and image URLs from the HTML"""
    
    drivers = {}  # Use dict to avoid duplicates
    
    # Look for motorsport.com CDN images with driver names in URL
    # Pattern: lando-norris, max-verstappen, etc.
    cdn_pattern = r'https://cdn-\d+\.motorsport\.com/images/mgl/[^/]+/s\d+/([a-z-]+)\.(?:jpg|webp)'
    matches = re.findall(cdn_pattern, html, re.IGNORECASE)
    
    print(f"Found {len(matches)} Motorsport CDN image matches")
    
    for url_slug in matches:
        # Extract driver name from URL slug (e.g., "lando-norris-mclaren" -> "lando norris")
        # Remove team names
        slug_parts = url_slug.split('-')
        
        # Common team name removals
        team_keywords = ['mclaren', 'ferrari', 'mercedes', 'redbull', 'red', 'bull', 'racing', 
                        'aston', 'martin', 'alpine', 'williams', 'haas', 'sauber', 'audi', 
                        'rb', 'team', 'f1']
        
        # Filter out team keywords
        name_parts = [part for part in slug_parts if part not in team_keywords]
        
        if len(name_parts) >= 2:
            # Assume first name last name
            driver_name = f"{name_parts[0]} {name_parts[1]}".title()
            
            # Construct image URL (using s800 for high quality)
            image_url = f"https://cdn-1.motorsport.com/images/mgl/{url_slug.split('-')[0]}/s800/{url_slug}.jpg"
            
            # Use better URL pattern - extract the hash from matches
            if driver_name not in drivers:
                drivers[driver_name] = {
                    'name': driver_name,
                    'url_slug': url_slug
                }
    
    # Now find actual image URLs with hashes
    # Pattern to match: cdn-X.motorsport.com/images/mgl/HASH/sXXX/driver-name.jpg
    full_url_pattern = r'(https://cdn-\d+\.motorsport\.com/images/mgl/([^/]+)/s\d+/([a-z-]+\.jpg))'
    full_matches = re.findall(full_url_pattern, html)
    
    # Build a mapping of slug to hash
    slug_to_hash = {}
    for full_url, hash_id, filename in full_matches:
        slug = filename.replace('.jpg', '')
        if slug not in slug_to_hash:
            slug_to_hash[slug] = hash_id
    
    # Update driver URLs with correct hashes
    driver_list = []
    seen_names = set()
    
    for driver_name, driver_info in drivers.items():
        url_slug = driver_info['url_slug']
        
        if url_slug in slug_to_hash:
            hash_id = slug_to_hash[url_slug]
            # Use s800 for good quality
            image_url = f"https://cdn-1.motorsport.com/images/mgl/{hash_id}/s800/{url_slug}.jpg"
            
            if driver_name not in seen_names:
                driver_list.append({
                    'name': driver_name,
                    'url': image_url
                })
                seen_names.add(driver_name)
                print(f"  ✓ {driver_name}: {image_url}")
    
    return driver_list

def match_driver_name(motorsport_name, our_drivers):
    """Match Motorsport.com driver name to our driver ID"""
    
    motorsport_name = motorsport_name.lower()
    
    # Direct matching
    for driver in our_drivers:
        full_name = f"{driver['given_name']} {driver['family_name']}".lower()
        
        if full_name in motorsport_name or motorsport_name in full_name:
            return driver['id']
        
        # Try family name only
        if driver['family_name'].lower() in motorsport_name:
            return driver['id']
    
    return None

def download_image(url, output_path, driver_name):
    """Download an image from URL"""
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.motorsport.com/'
    }
    
    try:
        # Clean URL
        if url.startswith('//'):
            url = 'https:' + url
        
        print(f"  → Downloading: {url[:80]}...")
        
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
            image_data = response.read()
        
        # Determine file extension
        ext = url.split('.')[-1].split('?')[0].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            ext = 'jpg'
        
        temp_file = output_path.replace('.jpg', f'_temp.{ext}')
        
        # Save temporary file
        with open(temp_file, 'wb') as f:
            f.write(image_data)
        
        # Convert to JPG if needed
        if ext in ['png', 'webp']:
            subprocess.run(
                ['sips', '-s', 'format', 'jpeg', temp_file, '--out', output_path],
                check=True,
                capture_output=True
            )
            os.remove(temp_file)
        else:
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rename(temp_file, output_path)
        
        file_size = os.path.getsize(output_path)
        print(f"  ✓ Saved ({file_size} bytes)")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def fetch_all_drivers():
    """Fetch all driver images from Motorsport.com"""
    
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    # Read our drivers from CSV
    our_drivers = []
    csv_file = os.path.join(DATA_DIR, "drivers_2025.csv")
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['code']:  # Only active drivers with codes
                our_drivers.append({
                    'id': row['driverId'],
                    'given_name': row['givenName'],
                    'family_name': row['familyName'],
                    'code': row['code']
                })
    
    print(f"Looking for images for {len(our_drivers)} drivers\n")
    
    # Fetch Motorsport.com page
    html = fetch_motorsport_page()
    
    if not html:
        print("❌ Failed to fetch Motorsport.com page")
        return
    
    # Save HTML for inspection
    with open('motorsport_drivers.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("✓ Saved HTML to motorsport_drivers.html for inspection\n")
    
    # Extract driver images
    motorsport_drivers = extract_driver_images(html)
    
    print(f"\n{'='*60}")
    print(f"Found {len(motorsport_drivers)} potential driver images")
    print(f"{'='*60}\n")
    
    if not motorsport_drivers:
        print("❌ No driver images found in HTML")
        print("The page structure may use dynamic JavaScript loading.")
        print("Analyzing HTML structure...")
        
        # Look for any patterns that might help
        print("\nSearching for alternative image patterns...")
        
        # Look for any high-quality images
        all_images = re.findall(r'(https://[^"\s]+\.(?:jpg|jpeg|png|webp))', html, re.IGNORECASE)
        
        # Filter for likely driver images
        driver_images = [img for img in all_images if any(
            keyword in img.lower() for keyword in ['driver', 'portrait', 'headshot', '2024', '2025', '2026']
        )]
        
        print(f"Found {len(driver_images)} potential driver images:")
        for img in driver_images[:20]:
            print(f"  {img}")
        
        return
    
    # Try to match and download
    success_count = 0
    
    for ms_driver in motorsport_drivers[:30]:  # Limit to first 30
        if ms_driver['name'] == 'Unknown':
            continue
        
        driver_id = match_driver_name(ms_driver['name'], our_drivers)
        
        if driver_id:
            output_file = os.path.join(IMAGES_DIR, f"{driver_id}.jpg")
            
            print(f"\n{ms_driver['name']} → {driver_id}")
            
            if download_image(ms_driver['url'], output_file, ms_driver['name']):
                success_count += 1
            
            time.sleep(0.5)  # Rate limiting
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully downloaded {success_count} driver images")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("=" * 60)
    print("Fetching F1 driver images from Motorsport.com")
    print("=" * 60)
    print()
    
    fetch_all_drivers()
