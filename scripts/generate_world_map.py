#!/usr/bin/env python3
"""Generate SVG paths for world map from Natural Earth GeoJSON data."""
import json
import urllib.request
import sys


def geo_to_svg(lng, lat, width=1000, height=500):
    """Convert geographic coordinates to SVG coordinates (equirectangular)."""
    x = (lng + 180) / 360 * width
    y = (90 - lat) / 180 * height
    return round(x, 1), round(y, 1)


def simplify_coords(coords, tolerance=3):
    """Simple Douglas-Peucker-like simplification to reduce point count."""
    if len(coords) <= 4:
        return coords
    
    # Keep every Nth point based on total count
    step = max(1, len(coords) // 80)  # Target ~80 points max per ring
    simplified = [coords[i] for i in range(0, len(coords), step)]
    if simplified[-1] != coords[-1]:
        simplified.append(coords[-1])
    return simplified


def coords_to_path(coords, width=1000, height=500):
    """Convert a ring of coordinates to an SVG path string."""
    # Simplify to reduce file size
    coords = simplify_coords(coords)
    
    points = []
    for i, coord in enumerate(coords):
        x, y = geo_to_svg(coord[0], coord[1], width, height)
        if i == 0:
            points.append(f'M{x} {y}')
        else:
            points.append(f'L{x} {y}')
    points.append('Z')
    return ''.join(points)


def process_geometry(geometry, width=1000, height=500, min_points=5):
    """Process a GeoJSON geometry into SVG paths."""
    paths = []
    if geometry['type'] == 'Polygon':
        for ring in geometry['coordinates']:
            if len(ring) >= min_points:
                paths.append(coords_to_path(ring, width, height))
    elif geometry['type'] == 'MultiPolygon':
        for polygon in geometry['coordinates']:
            for ring in polygon:
                if len(ring) >= min_points:
                    paths.append(coords_to_path(ring, width, height))
    return paths


def main():
    # Try to fetch GeoJSON from known sources
    urls = [
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
        "https://cdn.jsdelivr.net/npm/visionscarto-world-atlas@0.1.0/world/110m.geojson",
    ]
    
    data = None
    for url in urls:
        try:
            print(f"Trying {url}...", file=sys.stderr)
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            response = urllib.request.urlopen(req, timeout=15)
            data = json.loads(response.read())
            print(f"Success! Downloaded from {url}", file=sys.stderr)
            break
        except Exception as e:
            print(f"Failed: {e}", file=sys.stderr)
    
    if data is None:
        print("Could not fetch GeoJSON data from any source", file=sys.stderr)
        sys.exit(1)
    
    # Extract paths
    all_paths = []
    if 'features' in data:
        for feature in data['features']:
            paths = process_geometry(feature['geometry'])
            all_paths.extend(paths)
    elif 'geometries' in data:
        for geometry in data['geometries']:
            paths = process_geometry(geometry)
            all_paths.extend(paths)
    else:
        paths = process_geometry(data)
        all_paths.extend(paths)
    
    print(f"Generated {len(all_paths)} paths", file=sys.stderr)
    
    # Output as JS module
    output = []
    output.append("// lib/world-map-paths.js")
    output.append("// Auto-generated SVG paths for world map")
    output.append("// Source: Natural Earth 110m land boundaries")
    output.append(f"// Total landmass paths: {len(all_paths)}")
    output.append("")
    output.append("export const worldMapPaths = [")
    for i, path in enumerate(all_paths):
        comma = "," if i < len(all_paths) - 1 else ""
        output.append(f'  `{path}`{comma}')
    output.append("];")
    
    result = "\n".join(output)
    
    # Write to file
    output_path = "lib/world-map-paths.js"
    with open(output_path, "w") as f:
        f.write(result + "\n")
    
    print(f"Written to {output_path}", file=sys.stderr)
    print(f"File size: {len(result)} bytes", file=sys.stderr)


if __name__ == "__main__":
    main()
