#!/usr/bin/env python3
"""
Parse Wikipedia 2026 F1 HTML to extract official team-driver assignments
"""

import re
import os

# Change to project root
os.chdir('/Users/sachitsharma/Desktop/My Projects/F1-fantasy-league-v2')

with open('wikipedia_2026_f1.html', 'r') as f:
    html = f.read()

# Find the teams table
table_start = html.find('Teams and drivers that are contracted')
table_end = html.find('</tbody>', table_start)

if table_start > 0 and table_end > 0:
    table_html = html[table_start:table_end]
    
    # Known 2026 teams
    teams_map = {
        'Red Bull Racing': 'red_bull',
        'Scuderia Ferrari': 'ferrari',
        'Mercedes': 'mercedes',
        'McLaren': 'mclaren',
        'Aston Martin': 'aston_martin',
        'Alpine': 'alpine',
        'Haas': 'haas',
        'Williams': 'williams',
        'RB F1 Team': 'rb',
        'Audi': 'audi',
        'Cadillac Racing': 'cadillac'
    }
    
    # Driver name patterns from Wikipedia
    driver_patterns = {
        'Max Verstappen': 'verstappen',
        'Lando Norris': 'norris',
        'Charles Leclerc': 'leclerc',
        'Oscar Piastri': 'piastri',
        'Carlos Sainz': 'sainz',
        'George Russell': 'russell',
        'Lewis Hamilton': 'hamilton',
        'Fernando Alonso': 'alonso',
        'Nico Hülkenberg': 'hulkenberg',
        'Pierre Gasly': 'gasly',
        'Lance Stroll': 'stroll',
        'Esteban Ocon': 'ocon',
        'Alexander Albon': 'albon',
        'Isack Hadjar': 'hadjar',
        'Kimi Antonelli': 'antonelli',
        'Oliver Bearman': 'bearman',
        'Liam Lawson': 'lawson',
        'Valtteri Bottas': 'bottas',
        'Sergio Pérez': 'perez',
        'Gabriel Bortoleto': 'bortoleto',
        'Franco Colapinto': 'colapinto',
        'Arvid Lindblad': 'lindblad'
    }
    
    # Split by table rows
    rows = table_html.split('<tr>')
    
    teams = {}
    current_team = None
    
    for row in rows:
        # Check for team name
        for team_full, team_id in teams_map.items():
            if team_full in row or team_id in row:
                current_team = team_id
                if current_team not in teams:
                    teams[current_team] = []
                break
        
        # Check for driver names
        if current_team:
            for driver_full, driver_id in driver_patterns.items():
                if driver_full in row and driver_id not in teams[current_team]:
                    teams[current_team].append(driver_id)
    
    print("2026 F1 Grid from Wikipedia:")
    print("=" * 60)
    for team_id in ['red_bull', 'ferrari', 'mercedes', 'mclaren', 'aston_martin', 'alpine', 'haas', 'williams', 'rb', 'audi', 'cadillac']:
        if team_id in teams and teams[team_id]:
            drivers_str = ', '.join(teams[team_id])
            print(f"{team_id:20s}: {drivers_str}")
        else:
            print(f"{team_id:20s}: NO DRIVERS FOUND")
            
    print("\n" + "=" * 60)
    print("Summary:")
    total_drivers = sum(len(drivers) for drivers in teams.values())
    print(f"Total teams: {len(teams)}")
    print(f"Total drivers: {total_drivers}")
    
else:
    print("Could not find teams table")
