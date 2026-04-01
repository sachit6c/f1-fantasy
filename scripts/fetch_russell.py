#!/usr/bin/env python3
"""
Fetch George Russell's driver image from Mercedes F1 official website
"""

import os
import re
import urllib.request
import ssl
import subprocess

# Mercedes driver page
MERCEDES_URL = "https://www.mercedesamgf1.com/drivers/driver/george-russell"

# Output paths
IMAGES_DIR = "data/images/drivers"
OUTPUT_FILE = os.path.join(IMAGES_DIR, "russell.jpg")
TEMP_FILE = os.path.join(IMAGES_DIR, "russell_temp.jpg")

def fetch_mercedes_image():
    """Fetch George Russell's image from Mercedes F1 website"""
    
    # Create SSL context that doesn't verify certificates (for macOS issues)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    # Set up request with headers
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    print(f"Fetching Mercedes page: {MERCEDES_URL}")
    
    try:
        # Fetch the page
        req = urllib.request.Request(MERCEDES_URL, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context) as response:
            html = response.read().decode('utf-8', errors='ignore')
        
        print(f"✓ Page fetched ({len(html)} bytes)")
        
        # Look for image URLs in the HTML
        # Mercedes typically uses patterns like:
        # - img tags with driver photos
        # - High-res images in srcset or data attributes
        
        image_patterns = [
            # Standard img src
            r'<img[^>]*src="([^"]*russell[^"]*\.(?:jpg|jpeg|png|webp))"',
            r'<img[^>]*src="([^"]*driver[^"]*\.(?:jpg|jpeg|png|webp))"',
            r'<img[^>]*src="([^"]*portrait[^"]*\.(?:jpg|jpeg|png|webp))"',
            # Srcset patterns
            r'srcset="([^"]*russell[^"]*\.(?:jpg|jpeg|png|webp))[^"]*"',
            r'srcset="([^"]*driver[^"]*\.(?:jpg|jpeg|png|webp))[^"]*"',
            # Data attributes
            r'data-src="([^"]*russell[^"]*\.(?:jpg|jpeg|png|webp))"',
            r'data-src="([^"]*driver[^"]*\.(?:jpg|jpeg|png|webp))"',
            # Background images in style
            r'background-image:\s*url\(["\']?([^"\']+russell[^"\']+\.(?:jpg|jpeg|png|webp))["\']?\)',
            # Any Mercedes CDN image
            r'src="(https://[^"]*mercedesamgf1[^"]*\.(?:jpg|jpeg|png|webp))"',
            r'"url":"(https://[^"]*mercedesamgf1[^"]*\.(?:jpg|jpeg|png|webp))"',
        ]
        
        found_images = []
        
        for pattern in image_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                # Clean up URL
                url = match.strip()
                
                # Handle relative URLs
                if url.startswith('//'):
                    url = 'https:' + url
                elif url.startswith('/'):
                    url = 'https://www.mercedesamgf1.com' + url
                
                # Skip tiny icons and thumbnails
                if any(skip in url.lower() for skip in ['icon', 'thumb', 'logo', 'favicon', '50x', '100x']):
                    continue
                
                found_images.append(url)
                print(f"  Found image: {url}")
        
        if not found_images:
            print("\n❌ No driver images found in HTML")
            print("Searching for any image URLs...")
            
            # Broader search for any images
            all_images = re.findall(r'(["\'])(https://[^"\']+\.(?:jpg|jpeg|png|webp))["\'"]', html, re.IGNORECASE)
            for quote, img in all_images[:20]:  # Limit to first 20
                if 'driver' in img.lower() or 'russell' in img.lower() or 'portrait' in img.lower():
                    found_images.append(img)
                    print(f"  Candidate: {img}")
        
        if not found_images:
            print("\n❌ No suitable images found")
            return False
        
        # Try to download the best image
        # Prefer images with larger dimensions or higher quality indicators
        best_image = found_images[0]
        
        for img in found_images:
            # Prefer larger sizes
            if any(indicator in img.lower() for indicator in ['large', 'high', 'full', 'original', '1920', '1080', '2000']):
                best_image = img
                break
            # Or avoid small sizes
            if not any(small in img.lower() for small in ['small', 'thumb', 'preview', '300', '400']):
                best_image = img
        
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
        ext = best_image.split('.')[-1].split('?')[0].lower()
        if ext in ['png', 'webp']:
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
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    print("=" * 60)
    print("Fetching George Russell's image from Mercedes F1")
    print("=" * 60)
    
    success = fetch_mercedes_image()
    
    if success:
        print("\n✅ Successfully downloaded George Russell's image")
    else:
        print("\n❌ Failed to download image")
