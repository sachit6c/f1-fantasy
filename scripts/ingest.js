#!/usr/bin/env node

/**
 * F1 Data Ingestion Script
 *
 * Downloads F1 season data from Jolpica API and saves to:
 * - Raw JSON snapshots (/data/snapshots/{season}/)
 * - Canonical CSVs (/data/canonical/)
 *
 * Usage:
 *   node scripts/ingest.js 2025
 *   node scripts/ingest.js 2024 --force  (overwrite existing)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

// Parse command line arguments
const args = process.argv.slice(2);
const season = args[0] || new Date().getFullYear();
const force = args.includes('--force');

console.log(`\n🏎️  F1 Data Ingestion Script`);
console.log(`📅 Season: ${season}`);
console.log(`🔄 Force overwrite: ${force ? 'Yes' : 'No'}\n`);

/**
 * Fetch JSON from Jolpica API with error handling
 */
async function fetchAPI(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`  Fetching: ${endpoint}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`  ❌ Error fetching ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Save JSON snapshot
 */
async function saveSnapshot(season, name, data) {
  const dir = path.join(PROJECT_ROOT, 'data', 'snapshots', season.toString());
  await fs.mkdir(dir, { recursive: true });

  const filename = path.join(dir, `${name}.json`);
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  console.log(`  ✓ Saved snapshot: ${name}.json`);
}

/**
 * Convert array of objects to CSV
 */
function arrayToCSV(data, columns) {
  if (!data || data.length === 0) return '';

  const header = columns.join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col];

      // Handle null/undefined
      if (value === null || value === undefined) return '';

      // Quote strings that contain commas, quotes, or newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Save CSV file
 */
async function saveCSV(filename, csvContent) {
  const filepath = path.join(PROJECT_ROOT, 'data', 'canonical', filename);
  await fs.writeFile(filepath, csvContent);
  console.log(`  ✓ Saved CSV: ${filename}`);
}

/**
 * Main ingestion function
 */
async function ingest() {
  try {
    console.log(`📥 Step 1: Fetching race calendar...`);
    const calendarData = await fetchAPI(`/${season}.json`);
    const races = calendarData.MRData.RaceTable.Races || [];
    await saveSnapshot(season, 'calendar', calendarData);
    console.log(`  ✓ Found ${races.length} races\n`);

    console.log(`📥 Step 2: Fetching drivers...`);
    const driversData = await fetchAPI(`/${season}/drivers.json?limit=100`);
    const drivers = driversData.MRData.DriverTable.Drivers || [];
    await saveSnapshot(season, 'drivers', driversData);
    console.log(`  ✓ Found ${drivers.length} drivers\n`);

    console.log(`📥 Step 3: Fetching constructors...`);
    const constructorsData = await fetchAPI(`/${season}/constructors.json`);
    const constructors = constructorsData.MRData.ConstructorTable.Constructors || [];
    await saveSnapshot(season, 'constructors', constructorsData);
    console.log(`  ✓ Found ${constructors.length} constructors\n`);

    console.log(`📥 Step 4: Fetching driver standings...`);
    const standingsData = await fetchAPI(`/${season}/driverStandings.json?limit=100`);
    const standings = standingsData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
    await saveSnapshot(season, 'driver_standings', standingsData);
    console.log(`  ✓ Found ${standings.length} driver standings\n`);

    console.log(`📥 Step 5: Fetching constructor standings...`);
    const constStandingsData = await fetchAPI(`/${season}/constructorStandings.json`);
    const constStandings = constStandingsData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
    await saveSnapshot(season, 'constructor_standings', constStandingsData);
    console.log(`  ✓ Found ${constStandings.length} constructor standings\n`);

    // Convert to CSVs
    console.log(`📝 Step 6: Creating CSV files...\n`);

    // Drivers CSV
    const driversCSV = arrayToCSV(
      drivers.map(d => ({
        driverId: d.driverId,
        permanentNumber: d.permanentNumber || '',
        code: d.code || '',
        givenName: d.givenName,
        familyName: d.familyName,
        dateOfBirth: d.dateOfBirth || '',
        nationality: d.nationality || '',
        url: d.url || ''
      })),
      ['driverId', 'permanentNumber', 'code', 'givenName', 'familyName', 'dateOfBirth', 'nationality', 'url']
    );
    await saveCSV(`drivers_${season}.csv`, driversCSV);

    // Constructors CSV
    const constructorsCSV = arrayToCSV(
      constructors.map(c => ({
        constructorId: c.constructorId,
        name: c.name,
        nationality: c.nationality || '',
        url: c.url || ''
      })),
      ['constructorId', 'name', 'nationality', 'url']
    );
    await saveCSV(`constructors_${season}.csv`, constructorsCSV);

    // Races CSV
    const racesCSV = arrayToCSV(
      races.map(r => ({
        season: r.season,
        round: r.round,
        raceName: r.raceName,
        circuitId: r.Circuit.circuitId,
        circuitName: r.Circuit.circuitName,
        locality: r.Circuit.Location.locality,
        country: r.Circuit.Location.country,
        lat: r.Circuit.Location.lat,
        long: r.Circuit.Location.long,
        date: r.date,
        time: r.time || ''
      })),
      ['season', 'round', 'raceName', 'circuitId', 'circuitName', 'locality', 'country', 'lat', 'long', 'date', 'time']
    );
    await saveCSV(`races_${season}.csv`, racesCSV);

    // Driver Standings CSV (season summary)
    const standingsCSV = arrayToCSV(
      standings.map(s => ({
        season: season,
        position: s.position,
        driverId: s.Driver.driverId,
        points: s.points,
        wins: s.wins,
        constructorId: s.Constructors[0]?.constructorId || ''
      })),
      ['season', 'position', 'driverId', 'points', 'wins', 'constructorId']
    );
    await saveCSV(`driver_standings_${season}.csv`, standingsCSV);

    // Constructor Standings CSV
    const constStandingsCSV = arrayToCSV(
      constStandings.map(s => ({
        season: season,
        position: s.position,
        constructorId: s.Constructor.constructorId,
        points: s.points,
        wins: s.wins
      })),
      ['season', 'position', 'constructorId', 'points', 'wins']
    );
    await saveCSV(`constructor_standings_${season}.csv`, constStandingsCSV);

    console.log(`\n✅ Ingestion complete!`);
    console.log(`\n📂 Data saved to:`);
    console.log(`   - Snapshots: /data/snapshots/${season}/`);
    console.log(`   - CSVs: /data/canonical/`);
    console.log(`\n💡 You can now manually edit CSV files to add corrections.`);
    console.log(`   Data will be loaded from CSV on next app startup.\n`);

  } catch (error) {
    console.error(`\n❌ Ingestion failed:`, error.message);
    process.exit(1);
  }
}

// Run ingestion
ingest();
