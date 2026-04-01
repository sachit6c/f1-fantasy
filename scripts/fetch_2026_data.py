#!/usr/bin/env python3
"""
Fetch 2026 season data from the Jolpica (Ergast) API and store locally as CSV.

Usage:
    python3 scripts/fetch_2026_data.py

This fetches drivers, constructors, races, driver standings, constructor standings,
and race results for the 2026 season and writes them to data/canonical/*.csv files.
It also regenerates driver/constructor SVG images.
"""

import csv
import json
import os
import ssl
import sys
import urllib.request
import urllib.error

BASE_URL = "https://api.jolpi.ca/ergast/f1"
SEASON = 2026
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_DIR = os.path.join(BASE_DIR, "data", "canonical")

# Create an SSL context that doesn't verify certificates (macOS workaround)
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# -------------------------------------------------------------------
# Team colors (kept in sync with data-store.js getTeamColors)
# -------------------------------------------------------------------
TEAM_COLORS = {
    "red_bull": "#3671C6",
    "ferrari": "#E8002D",
    "mercedes": "#27F4D2",
    "mclaren": "#FF8000",
    "aston_martin": "#229971",
    "alpine": "#FF87BC",
    "haas": "#B6BABD",
    "alphatauri": "#6692FF",
    "rb": "#6692FF",
    "williams": "#64C4FF",
    "alfa": "#C92D4B",
    "sauber": "#52E252",
    "kick_sauber": "#52E252",
    "audi": "#E00400",
    "cadillac": "#FFD700",
}


def api_fetch(endpoint):
    """Fetch JSON from the Jolpica API."""
    url = f"{BASE_URL}{endpoint}"
    print(f"  Fetching {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "F1-Fantasy-League/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        print(f"  ⚠️  HTTP {exc.code} for {url}")
        return None
    except Exception as exc:
        print(f"  ⚠️  Error fetching {url}: {exc}")
        return None


def write_csv(filename, rows, fieldnames):
    """Write rows to a CSV file."""
    filepath = os.path.join(CSV_DIR, filename)
    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✅ Wrote {len(rows)} rows → {filepath}")


def fetch_drivers():
    """Fetch and store drivers."""
    data = api_fetch(f"/{SEASON}/drivers.json?limit=100")
    if not data:
        return []
    drivers = data["MRData"]["DriverTable"]["Drivers"]
    rows = []
    for d in drivers:
        rows.append({
            "driverId": d["driverId"],
            "permanentNumber": d.get("permanentNumber", ""),
            "code": d.get("code", ""),
            "givenName": d["givenName"],
            "familyName": d["familyName"],
            "dateOfBirth": d.get("dateOfBirth", ""),
            "nationality": d.get("nationality", ""),
            "url": d.get("url", ""),
        })
    write_csv(
        f"drivers_{SEASON}.csv",
        rows,
        ["driverId", "permanentNumber", "code", "givenName", "familyName",
         "dateOfBirth", "nationality", "url"],
    )
    return drivers


def fetch_constructors():
    """Fetch and store constructors."""
    data = api_fetch(f"/{SEASON}/constructors.json")
    if not data:
        return []
    constructors = data["MRData"]["ConstructorTable"]["Constructors"]
    rows = []
    for c in constructors:
        rows.append({
            "constructorId": c["constructorId"],
            "name": c["name"],
            "nationality": c.get("nationality", ""),
            "url": c.get("url", ""),
        })
    write_csv(
        f"constructors_{SEASON}.csv",
        rows,
        ["constructorId", "name", "nationality", "url"],
    )
    return constructors


def fetch_races():
    """Fetch and store race calendar."""
    data = api_fetch(f"/{SEASON}.json")
    if not data:
        return []
    races = data["MRData"]["RaceTable"]["Races"]
    rows = []
    for r in races:
        rows.append({
            "season": r["season"],
            "round": r["round"],
            "raceName": r["raceName"],
            "circuitId": r["Circuit"]["circuitId"],
            "circuitName": r["Circuit"]["circuitName"],
            "locality": r["Circuit"]["Location"]["locality"],
            "country": r["Circuit"]["Location"]["country"],
            "date": r["date"],
        })
    write_csv(
        f"races_{SEASON}.csv",
        rows,
        ["season", "round", "raceName", "circuitId", "circuitName",
         "locality", "country", "date"],
    )
    return races


def fetch_driver_standings():
    """Fetch and store driver standings."""
    data = api_fetch(f"/{SEASON}/driverStandings.json?limit=100")
    if not data:
        return []
    lists = data["MRData"]["StandingsTable"]["StandingsLists"]
    if not lists:
        print("  ⚠️  No driver standings available yet")
        return []
    standings = lists[0]["DriverStandings"]
    rows = []
    for s in standings:
        constructor_id = ""
        if s.get("Constructors"):
            constructor_id = s["Constructors"][0]["constructorId"]
        rows.append({
            "season": SEASON,
            "position": s["position"],
            "driverId": s["Driver"]["driverId"],
            "points": s["points"],
            "wins": s["wins"],
            "constructorId": constructor_id,
        })
    write_csv(
        f"driver_standings_{SEASON}.csv",
        rows,
        ["season", "position", "driverId", "points", "wins", "constructorId"],
    )
    return standings


def fetch_constructor_standings():
    """Fetch and store constructor standings."""
    data = api_fetch(f"/{SEASON}/constructorStandings.json")
    if not data:
        return []
    lists = data["MRData"]["StandingsTable"]["StandingsLists"]
    if not lists:
        print("  ⚠️  No constructor standings available yet")
        return []
    standings = lists[0]["ConstructorStandings"]
    rows = []
    for s in standings:
        rows.append({
            "season": SEASON,
            "position": s["position"],
            "constructorId": s["Constructor"]["constructorId"],
            "points": s["points"],
            "wins": s["wins"],
        })
    write_csv(
        f"constructor_standings_{SEASON}.csv",
        rows,
        ["season", "position", "constructorId", "points", "wins"],
    )
    return standings


def fetch_race_results(total_rounds):
    """Fetch race results for all completed rounds."""
    all_results = []
    for rnd in range(1, total_rounds + 1):
        data = api_fetch(f"/{SEASON}/{rnd}/results.json")
        if not data:
            break
        races = data["MRData"]["RaceTable"]["Races"]
        if not races or not races[0].get("Results"):
            print(f"  ⚠️  No results for round {rnd} yet — stopping")
            break
        race = races[0]
        circuit_id = race["Circuit"]["circuitId"]
        for r in race["Results"]:
            all_results.append({
                "season": SEASON,
                "round": rnd,
                "circuitId": circuit_id,
                "driverId": r["Driver"]["driverId"],
                "position": r["position"],
                "grid": r["grid"],
                "points": r["points"],
                "laps": r["laps"],
                "status": r["status"],
                "fastestLapRank": r.get("FastestLap", {}).get("rank", ""),
            })

    write_csv(
        f"race_results_{SEASON}.csv",
        all_results,
        ["season", "round", "circuitId", "driverId", "position", "grid",
         "points", "laps", "status", "fastestLapRank"],
    )
    return all_results


def main():
    os.makedirs(CSV_DIR, exist_ok=True)

    print(f"🏎️  Fetching {SEASON} season data from Jolpica API...\n")

    fetch_drivers()
    fetch_constructors()
    races = fetch_races()
    fetch_driver_standings()
    fetch_constructor_standings()

    total_rounds = len(races) if races else 24
    print(f"\n  Calendar has {total_rounds} rounds, fetching results...")
    fetch_race_results(total_rounds)

    # Fetch real driver and constructor images from Wikipedia
    print("\n📸 Fetching driver/constructor photos...")
    import importlib.util
    img_script = os.path.join(BASE_DIR, "scripts", "fetch_driver_images.py")
    spec = importlib.util.spec_from_file_location("fetch_driver_images", img_script)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    print(f"\n✅ {SEASON} season data updated successfully!")
    print("   Reload the app in your browser to see the latest data.")


if __name__ == "__main__":
    main()
