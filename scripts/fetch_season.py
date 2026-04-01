#!/usr/bin/env python3
"""
Unified F1 season data pipeline.

Fetches ALL data for a given season from the Jolpica (Ergast) API and writes:
  - Raw JSON snapshots  →  data/snapshots/<season>/
  - Canonical CSVs      →  data/canonical/

Datasets fetched:
  1. Drivers
  2. Constructors
  3. Race calendar
  4. Driver standings (final / latest)
  5. Constructor standings (final / latest)
  6. Race results (all completed rounds)
  7. Qualifying results (all completed rounds)

Usage:
    python3 scripts/fetch_season.py <year>
    python3 scripts/fetch_season.py 2023
    python3 scripts/fetch_season.py 2024

Adding a new season:
    1. Run this script with the desired year.
    2. Add the year to the season dropdown in components/header.js
       (search for the `[2021, 2022, ...]` array and append the new year).
    3. Reload the app — the data-store and all views are year-aware automatically.
"""

import csv
import json
import os
import ssl
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = "https://api.jolpi.ca/ergast/f1"
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_DIR = BASE_DIR / "data" / "canonical"
SNAPSHOT_DIR = BASE_DIR / "data" / "snapshots"

RATE_LIMIT_SLEEP = 0.5   # seconds between API calls

# SSL context (macOS fix - skips cert verification)
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def api_fetch(endpoint: str) -> dict | None:
    """GET a Jolpica endpoint and return parsed JSON, or None on error."""
    url = f"{BASE_URL}{endpoint}"
    print(f"    GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "F1-Fantasy-League/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        print(f"    ⚠️  HTTP {exc.code}")
        return None
    except Exception as exc:
        print(f"    ⚠️  {exc}")
        return None


def save_snapshot(season: int, name: str, data: dict):
    """Persist raw API response as a JSON snapshot."""
    d = SNAPSHOT_DIR / str(season)
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{name}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"    💾 snapshot → data/snapshots/{season}/{name}.json")


def write_csv(filename: str, rows: list[dict], fieldnames: list[str]):
    """Write rows to a canonical CSV file."""
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    path = CSV_DIR / filename
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"    ✅ {len(rows):>4} rows → data/canonical/{filename}")


# ---------------------------------------------------------------------------
# Step implementations
# ---------------------------------------------------------------------------

def fetch_drivers(season: int) -> list:
    print("\n📥  Step 1 — Drivers")
    data = api_fetch(f"/{season}/drivers.json?limit=100")
    if not data:
        print("    ❌ Failed")
        return []
    drivers = data["MRData"]["DriverTable"]["Drivers"]
    save_snapshot(season, "drivers", data)
    rows = [
        {
            "driverId": d["driverId"],
            "permanentNumber": d.get("permanentNumber", ""),
            "code": d.get("code", ""),
            "givenName": d["givenName"],
            "familyName": d["familyName"],
            "dateOfBirth": d.get("dateOfBirth", ""),
            "nationality": d.get("nationality", ""),
            "url": d.get("url", ""),
        }
        for d in drivers
    ]
    write_csv(
        f"drivers_{season}.csv",
        rows,
        ["driverId", "permanentNumber", "code", "givenName", "familyName",
         "dateOfBirth", "nationality", "url"],
    )
    print(f"    ✓ {len(drivers)} drivers")
    return drivers


def fetch_constructors(season: int) -> list:
    print("\n📥  Step 2 — Constructors")
    data = api_fetch(f"/{season}/constructors.json?limit=50")
    if not data:
        print("    ❌ Failed")
        return []
    constructors = data["MRData"]["ConstructorTable"]["Constructors"]
    save_snapshot(season, "constructors", data)
    rows = [
        {
            "constructorId": c["constructorId"],
            "name": c["name"],
            "nationality": c.get("nationality", ""),
            "url": c.get("url", ""),
        }
        for c in constructors
    ]
    write_csv(
        f"constructors_{season}.csv",
        rows,
        ["constructorId", "name", "nationality", "url"],
    )
    print(f"    ✓ {len(constructors)} constructors")
    return constructors


def fetch_races(season: int) -> list:
    print("\n📥  Step 3 — Race calendar")
    data = api_fetch(f"/{season}.json")
    if not data:
        print("    ❌ Failed")
        return []
    races = data["MRData"]["RaceTable"]["Races"]
    save_snapshot(season, "calendar", data)
    rows = [
        {
            "season": r["season"],
            "round": r["round"],
            "raceName": r["raceName"],
            "circuitId": r["Circuit"]["circuitId"],
            "circuitName": r["Circuit"]["circuitName"],
            "locality": r["Circuit"]["Location"]["locality"],
            "country": r["Circuit"]["Location"]["country"],
            "lat": r["Circuit"]["Location"].get("lat", ""),
            "long": r["Circuit"]["Location"].get("long", ""),
            "date": r["date"],
            "time": r.get("time", ""),
        }
        for r in races
    ]
    write_csv(
        f"races_{season}.csv",
        rows,
        ["season", "round", "raceName", "circuitId", "circuitName",
         "locality", "country", "lat", "long", "date", "time"],
    )
    print(f"    ✓ {len(races)} races")
    return races


def fetch_driver_standings(season: int) -> list:
    print("\n📥  Step 4 — Driver standings")
    data = api_fetch(f"/{season}/driverStandings.json?limit=100")
    if not data:
        print("    ❌ Failed")
        return []
    standings_list = data["MRData"]["StandingsTable"]["StandingsLists"]
    if not standings_list:
        print("    ⚠️  No standings yet — skipping")
        return []
    save_snapshot(season, "driver_standings", data)
    standings = standings_list[0]["DriverStandings"]
    rows = [
        {
            "season": season,
            "position": s.get("position", s.get("positionText", "")),
            "driverId": s["Driver"]["driverId"],
            "points": s["points"],
            "wins": s["wins"],
            "constructorId": s["Constructors"][0]["constructorId"] if s.get("Constructors") else "",
        }
        for s in standings
    ]
    write_csv(
        f"driver_standings_{season}.csv",
        rows,
        ["season", "position", "driverId", "points", "wins", "constructorId"],
    )
    print(f"    ✓ {len(standings)} driver standings")
    return standings


def fetch_constructor_standings(season: int) -> list:
    print("\n📥  Step 5 — Constructor standings")
    data = api_fetch(f"/{season}/constructorStandings.json?limit=50")
    if not data:
        print("    ❌ Failed")
        return []
    standings_list = data["MRData"]["StandingsTable"]["StandingsLists"]
    if not standings_list:
        print("    ⚠️  No standings yet — skipping")
        return []
    save_snapshot(season, "constructor_standings", data)
    standings = standings_list[0]["ConstructorStandings"]
    rows = [
        {
            "season": season,
            "position": s.get("position", s.get("positionText", "")),
            "constructorId": s["Constructor"]["constructorId"],
            "points": s["points"],
            "wins": s["wins"],
        }
        for s in standings
    ]
    write_csv(
        f"constructor_standings_{season}.csv",
        rows,
        ["season", "position", "constructorId", "points", "wins"],
    )
    print(f"    ✓ {len(standings)} constructor standings")
    return standings


def fetch_race_results(season: int, total_rounds: int) -> list:
    print(f"\n📥  Step 6 — Race results  ({total_rounds} rounds to try)")
    all_rows = []
    snapshots = []

    for rnd in range(1, total_rounds + 1):
        data = api_fetch(f"/{season}/{rnd}/results.json")
        time.sleep(RATE_LIMIT_SLEEP)

        if not data:
            print(f"    ✗ Round {rnd}: API error — stopping")
            break

        races = data["MRData"]["RaceTable"]["Races"]
        if not races or not races[0].get("Results"):
            print(f"    ✗ Round {rnd}: no results yet — stopping")
            break

        race = races[0]
        print(f"    ✓ Round {rnd}: {race['raceName']} ({len(race['Results'])} results)")
        snapshots.append(race)

        circuit_id = race["Circuit"]["circuitId"]
        for r in race["Results"]:
            all_rows.append({
                "season": season,
                "round": rnd,
                "circuitId": circuit_id,
                "driverId": r["Driver"]["driverId"],
                "constructorId": r["Constructor"]["constructorId"],
                "position": r.get("position", ""),
                "grid": r.get("grid", ""),
                "points": r.get("points", "0"),
                "laps": r.get("laps", ""),
                "status": r.get("status", ""),
                "fastestLapRank": r.get("FastestLap", {}).get("rank", ""),
            })

    if snapshots:
        save_snapshot(season, "race_results", {"races": snapshots})

    write_csv(
        f"race_results_{season}.csv",
        all_rows,
        ["season", "round", "circuitId", "driverId", "constructorId",
         "position", "grid", "points", "laps", "status", "fastestLapRank"],
    )
    print(f"    ✓ {len(all_rows)} result rows across {len(snapshots)} races")
    return all_rows


def fetch_qualifying(season: int, total_rounds: int) -> list:
    print(f"\n📥  Step 7 — Qualifying  ({total_rounds} rounds to try)")
    all_rows = []
    snapshots = []

    for rnd in range(1, total_rounds + 1):
        data = api_fetch(f"/{season}/{rnd}/qualifying.json")
        time.sleep(RATE_LIMIT_SLEEP)

        if not data:
            print(f"    ✗ Round {rnd}: API error — stopping")
            break

        races = data["MRData"]["RaceTable"]["Races"]
        if not races or not races[0].get("QualifyingResults"):
            print(f"    ✗ Round {rnd}: no qualifying data yet — stopping")
            break

        race = races[0]
        print(f"    ✓ Round {rnd}: {race['raceName']} ({len(race['QualifyingResults'])} entries)")
        snapshots.append(race)

        circuit_id = race["Circuit"]["circuitId"]
        race_id = f"{season}_{str(rnd).zfill(2)}"
        for r in race["QualifyingResults"]:
            all_rows.append({
                "season": season,
                "round": rnd,
                "raceId": race_id,
                "circuitId": circuit_id,
                "driverId": r["Driver"]["driverId"],
                "constructorId": r["Constructor"]["constructorId"],
                "position": r.get("position", ""),
                "q1": r.get("Q1", ""),
                "q2": r.get("Q2", ""),
                "q3": r.get("Q3", ""),
            })

    if snapshots:
        save_snapshot(season, "qualifying", {"races": snapshots})

    write_csv(
        f"qualifying_{season}.csv",
        all_rows,
        ["season", "round", "raceId", "circuitId", "driverId", "constructorId",
         "position", "q1", "q2", "q3"],
    )
    print(f"    ✓ {len(all_rows)} qualifying rows across {len(snapshots)} rounds")
    return all_rows


def fetch_images():
    """Run the shared image fetcher (covers all seasons auto-discovered in canonical/)."""
    print("\n📸  Step 8 — Driver & constructor images")
    import importlib.util
    img_script = BASE_DIR / "scripts" / "fetch_driver_images.py"
    spec = importlib.util.spec_from_file_location("fetch_driver_images", str(img_script))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.fetch_driver_images()
    mod.fetch_constructor_images()


def _rounds_from_local_csv(season: int) -> int:
    """Read total rounds from the local races CSV (avoids an extra API call)."""
    races_csv = CSV_DIR / f"races_{season}.csv"
    if not races_csv.exists():
        return 24  # safe fallback
    with open(races_csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return len(rows) if rows else 24


def refresh(season: int):
    """
    Lightweight in-season refresh.
    Re-fetches only the data that changes race-by-race:
      • qualifying results
      • race results
      • driver standings
      • constructor standings
    Static data (drivers, constructors, calendar) is left untouched.
    """
    print(f"\n{'='*60}")
    print(f"  🔄  F1 Season Refresh  —  {season}")
    print(f"{'='*60}")
    print("  Updating: qualifying, race results, standings")
    print("  Skipping: drivers, constructors, calendar\n")

    total_rounds = _rounds_from_local_csv(season)
    print(f"  Calendar has {total_rounds} rounds (read from local CSV)\n")

    fetch_qualifying(season, total_rounds)
    fetch_race_results(season, total_rounds)
    fetch_driver_standings(season)
    fetch_constructor_standings(season)

    print(f"\n{'='*60}")
    print(f"  ✅  Refresh complete for {season}!")
    print(f"      qualifying_{season}.csv")
    print(f"      race_results_{season}.csv")
    print(f"      driver_standings_{season}.csv")
    print(f"      constructor_standings_{season}.csv")
    print(f"{'='*60}\n")
    print("Reload the app in your browser to see the latest data.\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def run(season: int, skip_images: bool = False):
    print(f"\n{'='*60}")
    print(f"  🏎️  F1 Season Data Pipeline  —  {season}")
    print(f"{'='*60}")

    fetch_drivers(season)
    fetch_constructors(season)
    races = fetch_races(season)
    fetch_driver_standings(season)
    fetch_constructor_standings(season)

    total_rounds = len(races) if races else 24
    fetch_race_results(season, total_rounds)
    fetch_qualifying(season, total_rounds)

    if not skip_images:
        fetch_images()
    else:
        print("\n⏭️   Skipping images (--no-images flag set)")

    print(f"\n{'='*60}")
    print(f"  ✅  {season} complete!")
    print(f"      CSVs   → data/canonical/*_{season}.csv")
    print(f"      JSON   → data/snapshots/{season}/")
    print(f"      Images → data/images/drivers/ & constructors/")
    print(f"{'='*60}\n")
    print("Next step: confirm the year appears in components/header.js season list.\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 scripts/fetch_season.py <year>              # full fetch")
        print("  python3 scripts/fetch_season.py <year> --refresh    # in-season update only")
        print("  python3 scripts/fetch_season.py <year> --no-images  # full fetch, skip images")
        print("Example: python3 scripts/fetch_season.py 2026 --refresh")
        sys.exit(1)

    try:
        yr = int(sys.argv[1])
    except ValueError:
        print(f"Error: '{sys.argv[1]}' is not a valid year")
        sys.exit(1)

    if yr < 1950 or yr > 2100:
        print(f"Error: year {yr} looks out of range")
        sys.exit(1)

    if "--refresh" in sys.argv:
        refresh(yr)
    else:
        no_images = "--no-images" in sys.argv
        run(yr, skip_images=no_images)
