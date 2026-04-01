#!/usr/bin/env python3
"""
Fetch Oscar Piastri's driver image from ESPN
"""

import os
import re
import urllib.request
import ssl
import subprocess

# ESPN driver page
ESPN_URL = "https://www.espn.com/racing/driver/_/id/5752/oscar-piastri"

# Output paths
IMAGES_DIR = "data/images/drivers"
OUTPUT_FILE = os.path.join(IMAGES_DIR, "piastri.jpg")
TEMP_FILE = os.path.join(IMAGES_DIR, "piastri_espn_temp.jpg")

def fetch_espn_image():
    """Fetch Oscar Piastri's image from ESPN"""
    
    # Create SSL context that doesn't verify certificates (for macOS issues)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Set up request with headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    print(f"Fetching ESPN page: {ESPN_URL}")
    
    try:
        # Fetch the page
        req = urllib.request.Request(ESPN_URL, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        print(f"✓ Page fetched ({len(html)} bytes)")
        
        # Look for image URLs in the HTML
        # ESPN typically uses patterns like:
        # - a.espncdn.com/combiner/i?img=/i/headshots/...
        # - a.espncdn.com/i/headshots/rpm/...
        # - Image tags with class "Image"
        
        image_patterns = [
            r'<img[^>]*class="[^"]*Image[^"]*"[^>]*src="([^"]+)"',
            r'<img[^>]*src="([^"]+)"[^>]*class="[^"]*Image[^"]*"',
            r'src="(https://a\.espncdn\.com/[^"]*headshots[^"]+)"',
            r'src="(https://a\.espncdn\.com/combiner/i\?img=[^"]*headshots[^"]+)"',
            r'data-default-src="([^"]+)"',
            r'"url":"(https://a\.espncdn\.com/[^"]*headshots[^"]+)"',
        ]
        
        found_images = []
        
        for pattern in image_patterns:
            matches = re.findall(pattern, html)
            for match in matches:
                if match and ('headshot' in match.lower() or 'driver' in match.lower() or 'piastri' in match.lower()):
                    # Clean up URL
                    url = match
                    # Handle relative URLs
                    if url.startswith('//'):
                        url = 'https:' + url
                    elif url.startswith('/'):
                        url = 'https://www.espn.com' + url
                    
                    found_images.append(url)
                    print(f"  Found image: {url}")
        
        if not found_images:
            print("\n❌ No driver images found in HTML")
            print("Searching for any ESPN CDN images...")
            
            # Broader search for any ESPN images
            all_images = re.findall(r'src="(https://a\.espncdn\.com/[^"]+\.(?:jpg|jpeg|png|webp))"', html, re.IGNORECASE)
            print(f"Found {len(all_images)} ESPN CDN images total")
            
            # Filter for likely driver images (larger dimensions)
            for img in all_images:
                if any(keyword in img.lower() for keyword in ['driver', 'rpm', 'racing', 'headshot']):
                    found_images.append(img)
                    print(f"  Candidate: {img}")
        
        if not found_images:
            print("\n❌ No suitable images found")
            return False
        
        # Try to download the best image
        best_image = found_images[0]
        
        # Prefer higher quality images
        for img in found_images:
            # Look for larger dimensions in URL
            if any(dim in img for dim in ['w_400', 'w_500', 'w_600', 'h_400', 'h_500', 'h_600']):
                best_image = img
                break
        
        print(f"\n→ Downloading: {best_image}")
        
        # Download the image
        req = urllib.request.Request(best_image, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context) as response:
            image_data = response.read()
        
        # Save temporary file
        with open(TEMP_FILE, 'wb') as f:
            f.write(image_data)
        
        print(f"✓ Downloaded ({len(image_data)} bytes)")
        
        # Convert to JPG if needed
        if TEMP_FILE.endswith(('.png', '.webp')) or 'png' in best_image or 'webp' in best_image:
            print("Converting to JPG...")
            subprocess.run(['sips', '-s', 'format', 'jpeg', TEMP_FILE, '--out', OUTPUT_FILE], 
                          check=True, capture_output=True)
            os.remove(TEMP_FILE)
        else:
            # Rename temp file
            if os.path.exists(OUTPUT_FILE):
                os.remove(OUTPUT_FILE)
            os.rename(TEMP_FILE, OUTPUT_FILE)
        
        print(f"✓ Saved as: {OUTPUT_FILE}")
        
        # Get dimensions
        result = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', OUTPUT_FILE],
                              capture_output=True, text=True)
        print(f"Image dimensions:\n{result.stdout}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    print("=" * 60)
    print("Fetching Oscar Piastri's image from ESPN")
    print("=" * 60)
    
    success = fetch_espn_image()
    
    if success:
        print("\n✅ Successfully downloaded Oscar Piastri's image from ESPN")
    else:
        print("\n❌ Failed to download image")
