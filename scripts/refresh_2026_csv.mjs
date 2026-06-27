// scripts/refresh_2026_csv.mjs
// Rebuilds the canonical CSVs for a season from the Jolpica (Ergast) API.
//
// Regenerates: race_results_<season>.csv, qualifying_<season>.csv,
//              driver_standings_<season>.csv, constructor_standings_<season>.csv
//
// Jolpica caps page size at 100 rows, so the season-wide results/qualifying
// endpoints are paged through with offset and merged by round — the same fix
// applied to lib/ergast-api.js.
//
// Usage:  node scripts/refresh_2026_csv.mjs [season]

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const PAGE_SIZE = 100;
const SEASON = parseInt(process.argv[2], 10) || 2026;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'data', 'canonical');

async function getJson(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`${endpoint} → ${res.status} ${res.statusText}`);
  return res.json();
}

// Page through a season-wide race endpoint, merging races split across pages.
async function fetchAllRacePages(basePath, resultsKey) {
  const racesByRound = new Map();
  const order = [];
  let offset = 0;
  let total = 0;

  do {
    const data = await getJson(`${basePath}.json?limit=${PAGE_SIZE}&offset=${offset}`);
    const mr = data.MRData;
    total = parseInt(mr.total, 10) || 0;
    const races = mr.RaceTable.Races || [];

    for (const race of races) {
      const existing = racesByRound.get(race.round);
      if (existing) {
        existing[resultsKey] = (existing[resultsKey] || []).concat(race[resultsKey] || []);
      } else {
        racesByRound.set(race.round, { ...race, [resultsKey]: [...(race[resultsKey] || [])] });
        order.push(race.round);
      }
    }

    if (races.length === 0) break;
    offset += PAGE_SIZE;
  } while (offset < total);

  return order.map((round) => racesByRound.get(round));
}

// Minimal RFC-4180 field escaping.
function csvField(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header, rows) {
  const lines = [header.join(',')];
  for (const row of rows) lines.push(row.map(csvField).join(','));
  return lines.join('\n') + '\n';
}

async function write(name, content, rowCount) {
  const path = join(OUT_DIR, name);
  await writeFile(path, content, 'utf8');
  console.log(`✓ ${name}  (${rowCount} rows)`);
}

async function main() {
  console.log(`Refreshing ${SEASON} canonical CSVs from Jolpica…\n`);

  // ── Race results ──────────────────────────────────────────────────────────
  const raceRaces = await fetchAllRacePages(`/${SEASON}/results`, 'Results');
  const raceRows = [];
  for (const race of raceRaces) {
    const circuitId = race.Circuit.circuitId;
    for (const r of race.Results || []) {
      raceRows.push([
        SEASON,
        race.round,
        circuitId,
        r.Driver.driverId,
        r.Constructor?.constructorId || '',
        r.position,
        r.grid,
        r.points,
        r.laps,
        r.status,
        r.FastestLap?.rank || '',
      ]);
    }
  }
  await write(
    `race_results_${SEASON}.csv`,
    toCsv(
      ['season', 'round', 'circuitId', 'driverId', 'constructorId', 'position', 'grid', 'points', 'laps', 'status', 'fastestLapRank'],
      raceRows
    ),
    raceRows.length
  );

  // ── Qualifying ────────────────────────────────────────────────────────────
  const qualRaces = await fetchAllRacePages(`/${SEASON}/qualifying`, 'QualifyingResults');
  const qualRows = [];
  for (const race of qualRaces) {
    const circuitId = race.Circuit.circuitId;
    const raceId = `${SEASON}_${String(race.round).padStart(2, '0')}`;
    for (const q of race.QualifyingResults || []) {
      qualRows.push([
        SEASON,
        race.round,
        raceId,
        circuitId,
        q.Driver.driverId,
        q.Constructor?.constructorId || '',
        q.position,
        q.Q1 || '',
        q.Q2 || '',
        q.Q3 || '',
      ]);
    }
  }
  await write(
    `qualifying_${SEASON}.csv`,
    toCsv(
      ['season', 'round', 'raceId', 'circuitId', 'driverId', 'constructorId', 'position', 'q1', 'q2', 'q3'],
      qualRows
    ),
    qualRows.length
  );

  // ── Driver standings (one StandingsList; well under the page cap) ──────────
  const dsData = await getJson(`/${SEASON}/driverStandings.json?limit=100`);
  const dStandings = dsData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
  const dRows = dStandings.map((s) => [
    SEASON,
    s.position,
    s.Driver.driverId,
    s.points,
    s.wins,
    s.Constructors?.[s.Constructors.length - 1]?.constructorId || '',
  ]);
  await write(
    `driver_standings_${SEASON}.csv`,
    toCsv(['season', 'position', 'driverId', 'points', 'wins', 'constructorId'], dRows),
    dRows.length
  );

  // ── Constructor standings ─────────────────────────────────────────────────
  const csData = await getJson(`/${SEASON}/constructorStandings.json?limit=100`);
  const cStandings = csData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
  const cRows = cStandings.map((s) => [
    SEASON,
    s.position,
    s.Constructor.constructorId,
    s.points,
    s.wins,
  ]);
  await write(
    `constructor_standings_${SEASON}.csv`,
    toCsv(['season', 'position', 'constructorId', 'points', 'wins'], cRows),
    cRows.length
  );

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Refresh failed:', err.message);
  process.exit(1);
});
