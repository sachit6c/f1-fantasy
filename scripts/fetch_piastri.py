#!/usr/bin/env python3
"""
Fetch Oscar Piastri's official image from F1 website.
"""

import urllib.request
import ssl
import re
import subprocess
from pathlib import Path

# SSL workaround for macOS
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

BASE_DIR = Path(__file__).parent.parent
DRIVERS_DIR = BASE_DIR / 'data' / 'images' / 'drivers'

def fetch_piastri_image():
    """Fetch Oscar's image from his F1 driver page."""
    
    print("Fetching Oscar Piastri's page...")
    
    url = "https://www.formula1.com/en/drivers/oscar-piastri"
    
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            html = response.read().decode('utf-8')
        
        # Find all image URLs
        image_pattern = r'https://media\.formula1\.com[^"\'<>\s]+\.(?:jpg|png|webp)'
        images = re.findall(image_pattern, html, re.IGNORECASE)
        
        print(f"Found {len(images)} total images")
        
        # Remove duplicates
        unique_images = list(dict.fromkeys(images))
        print(f"Unique images: {len(unique_images)}")
        
        # Look for driver headshot patterns - F1 typically uses specific paths
        priority_patterns = [
            r'/content/dam/fom-website/drivers/.*\.jpg',
            r'/fom-website/drivers/.*\.(jpg|png)',
            r'w_1320.*drivers',
            r'headshot',
            r'portrait'
        ]
        
        scored_images = []
        for img in unique_images:
            score = 0
            for pattern in priority_patterns:
                if re.search(pattern, img, re.IGNORECASE):
                    score += 1
            scored_images.append((score, img))
        
        # Sort by score
        scored_images.sort(reverse=True, key=lambda x: x[0])
        
        print(f"\nTop 10 image candidates:")
        for idx, (score, img) in enumerate(scored_images[:10], 1):
            print(f"{idx}. [score:{score}] {img[:120]}...")
        
        if scored_images and scored_images[0][0] > 0:
            best_image = scored_images[0][1]
        elif unique_images:
            # Fall back to first image
            best_image = unique_images[0]
        else:
            print("No images found")
            return
        
        print(f"\nUsing: {best_image}")
        
        # Download
        temp_path = DRIVERS_DIR / 'piastri_temp.tmp'
        output_path = DRIVERS_DIR / 'piastri.jpg'
        
        print("Downloading...")
        req = urllib.request.Request(best_image, headers={
            'User-Agent': 'Mozilla/5.0'
        })
        
        with urllib.request.urlopen(req, context=ssl_context, timeout=15) as response:
            image_data = response.read()
        
        with open(temp_path, 'wb') as f:
            f.write(image_data)
        
        print(f"Downloaded {len(image_data)} bytes")
        
        # Convert to JPG if needed
        if best_image.endswith('.jpg'):
            temp_path.rename(output_path)
            print(f"✓ Saved to {output_path}")
        else:
            print("Converting to JPG...")
            result = subprocess.run(
                ['sips', '-s', 'format', 'jpeg', str(temp_path), '--out', str(output_path)],
                capture_output=True,
                text=True
            )
            temp_path.unlink()
            
            if result.returncode == 0:
                print(f"✓ Saved to {output_path}")
            else:
                print(f"✗ Conversion failed: {result.stderr}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    fetch_piastri_image()
