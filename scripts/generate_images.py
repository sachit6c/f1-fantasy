#!/usr/bin/env python3
"""Generate SVG avatar images for all drivers and constructors."""

import csv
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEAM_COLORS = {
    'red_bull': '#3671C6',
    'ferrari': '#E8002D',
    'mercedes': '#27F4D2',
    'mclaren': '#FF8000',
    'aston_martin': '#229971',
    'alpine': '#FF87BC',
    'haas': '#B6BABD',
    'alphatauri': '#6692FF',
    'rb': '#6692FF',
    'williams': '#64C4FF',
    'alfa': '#C92D4B',
    'sauber': '#52E252',
    'kick_sauber': '#52E252',
    'audi': '#E00400',
    'cadillac': '#FFD700',
}

CONSTRUCTOR_ABBREVS = {
    'Red Bull': 'RBR',
    'Red Bull Racing': 'RBR',
    'Ferrari': 'FER',
    'Mercedes': 'MER',
    'McLaren': 'MCL',
    'Aston Martin': 'AMR',
    'Alpine F1 Team': 'ALP',
    'Haas F1 Team': 'HAA',
    'AlphaTauri': 'AT',
    'RB F1 Team': 'RB',
    'Williams': 'WIL',
    'Alfa Romeo': 'AR',
    'Sauber': 'SAU',
    'Kick Sauber': 'SAU',
    'Audi': 'AUD',
    'Cadillac F1 Team': 'CAD',
    'Cadillac': 'CAD',
}


def make_driver_svg(code, bg_color):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" '
        f'width="200" height="200">\n'
        f'  <rect width="200" height="200" fill="{bg_color}" rx="8"/>\n'
        f'  <text x="100" y="105" text-anchor="middle" dominant-baseline="middle" '
        f'font-family="Arial,Helvetica,sans-serif" font-size="60" font-weight="bold" '
        f'fill="white" letter-spacing="2">{code}</text>\n'
        f'</svg>\n'
    )


def make_constructor_svg(abbrev, bg_color):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" '
        f'width="200" height="120">\n'
        f'  <rect width="200" height="120" fill="{bg_color}" rx="8"/>\n'
        f'  <text x="100" y="65" text-anchor="middle" dominant-baseline="middle" '
        f'font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="bold" '
        f'fill="white" letter-spacing="3">{abbrev}</text>\n'
        f'</svg>\n'
    )


def main():
    drivers_dir = os.path.join(BASE_DIR, 'data', 'images', 'drivers')
    constructors_dir = os.path.join(BASE_DIR, 'data', 'images', 'constructors')
    os.makedirs(drivers_dir, exist_ok=True)
    os.makedirs(constructors_dir, exist_ok=True)

    # Collect all unique drivers across both seasons
    all_drivers = {}  # driverId -> (code, constructorId)

    for season in [2025, 2026]:
        standings_path = os.path.join(
            BASE_DIR, 'data', 'canonical', f'driver_standings_{season}.csv'
        )
        standings = {}
        with open(standings_path) as f:
            for row in csv.DictReader(f):
                standings[row['driverId']] = row['constructorId']

        drivers_path = os.path.join(
            BASE_DIR, 'data', 'canonical', f'drivers_{season}.csv'
        )
        with open(drivers_path) as f:
            for row in csv.DictReader(f):
                driver_id = row['driverId']
                code = row['code'] or (
                    row.get('givenName', '?')[0] + row.get('familyName', '?')[0]
                ).upper()
                constructor_id = standings.get(driver_id, '')
                if driver_id not in all_drivers and constructor_id:
                    all_drivers[driver_id] = (code, constructor_id)

    # Generate driver SVGs
    for driver_id, (code, constructor_id) in sorted(all_drivers.items()):
        bg_color = TEAM_COLORS.get(constructor_id, '#999999')
        svg = make_driver_svg(code, bg_color)
        filepath = os.path.join(drivers_dir, f'{driver_id}.svg')
        with open(filepath, 'w') as f:
            f.write(svg)
        print(f'  driver: {filepath} ({code}, {constructor_id})')

    # Collect all unique constructors
    all_constructors = {}
    for season in [2025, 2026]:
        path = os.path.join(
            BASE_DIR, 'data', 'canonical', f'constructors_{season}.csv'
        )
        with open(path) as f:
            for row in csv.DictReader(f):
                cid = row['constructorId']
                name = row['name']
                if cid not in all_constructors:
                    all_constructors[cid] = name

    # Generate constructor SVGs
    for cid, name in sorted(all_constructors.items()):
        bg_color = TEAM_COLORS.get(cid, '#999999')
        abbrev = CONSTRUCTOR_ABBREVS.get(name, name[:3].upper())
        svg = make_constructor_svg(abbrev, bg_color)
        filepath = os.path.join(constructors_dir, f'{cid}.svg')
        with open(filepath, 'w') as f:
            f.write(svg)
        print(f'  constructor: {filepath} ({abbrev})')

    print(
        f'\nGenerated {len(all_drivers)} driver + '
        f'{len(all_constructors)} constructor images'
    )


if __name__ == '__main__':
    main()
