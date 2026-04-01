// tests/integration/csv-to-datastore.integration.test.js
// Integration tests for the CSV parsing → DataStore transformation pipeline.
// Validates that raw CSV text flows correctly through parseCSV → transform → index.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseCSV } from '../../lib/csv-loader.js';
import { DataStore } from '../../lib/data-store.js';

describe('CSV Parsing → DataStore Integration', () => {

  // ─── parseCSV → transformCSVDrivers ────────────────────────────────────────

  describe('Drivers CSV end-to-end', () => {
    it('parses raw CSV and transforms into driver objects', () => {
      const csvText = `driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
max_verstappen,1,VER,Max,Verstappen,1997-09-30,Dutch,https://example.com
sergio_perez,11,PER,Sergio,Perez,1990-01-26,Mexican,https://example.com`;

      const standingsCsv = `season,driverId,constructorId,position,points,wins
2026,max_verstappen,red_bull,1,200,5
2026,sergio_perez,red_bull,2,60,0`;

      const drivers = parseCSV(csvText);
      const standings = parseCSV(standingsCsv);

      const ds = new DataStore();
      ds.season = 2026;
      const transformed = ds.transformCSVDrivers(drivers, standings);

      expect(transformed).toHaveLength(2);
      expect(transformed[0]).toMatchObject({
        driverId: 'max_verstappen',
        code: 'VER',
        number: 1,
        name: 'Max Verstappen',
        team: 'Red Bull Racing',
      });
    });

    it('filters out drivers without standings entries', () => {
      const csvText = `driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
max_verstappen,1,VER,Max,Verstappen,1997-09-30,Dutch,url
reserve_driver,99,RES,Reserve,Driver,2000-01-01,British,url`;

      const standingsCsv = `season,driverId,constructorId,position,points,wins
2026,max_verstappen,red_bull,1,200,5`;

      const drivers = parseCSV(csvText);
      const standings = parseCSV(standingsCsv);

      const ds = new DataStore();
      ds.season = 2026;
      const transformed = ds.transformCSVDrivers(drivers, standings);

      expect(transformed).toHaveLength(1);
      expect(transformed[0].driverId).toBe('max_verstappen');
    });
  });

  // ─── parseCSV → transformCSVRaceResults ────────────────────────────────────

  describe('Race results CSV end-to-end', () => {
    it('parses race results and builds correct raceId', () => {
      const csvText = `season,round,circuitId,driverId,constructorId,position,grid,points,laps,status,fastestLapRank
2026,1,albert_park,max_verstappen,red_bull,1,1,25,58,Finished,1
2026,1,albert_park,sergio_perez,red_bull,8,9,4,58,Finished,8`;

      const results = parseCSV(csvText);
      const ds = new DataStore();
      const transformed = ds.transformCSVRaceResults(results);

      expect(transformed).toHaveLength(2);
      expect(transformed[0].raceId).toBe('2026_01');
      expect(transformed[0].position).toBe(1);
      expect(transformed[0].fastestLapRank).toBe(1);
      expect(typeof transformed[0].points).toBe('number');
    });

    it('handles empty fastestLapRank as null', () => {
      const csvText = `season,round,circuitId,driverId,constructorId,position,grid,points,laps,status,fastestLapRank
2026,2,bahrain,sergio_perez,red_bull,20,9,0,30,Engine,`;

      const results = parseCSV(csvText);
      const ds = new DataStore();
      const transformed = ds.transformCSVRaceResults(results);

      expect(transformed[0].fastestLapRank).toBeNull();
      expect(transformed[0].status).toBe('Engine');
    });
  });

  // ─── parseCSV → transformCSVQualifying ─────────────────────────────────────

  describe('Qualifying CSV end-to-end', () => {
    it('parses qualifying data with q1/q2/q3 times', () => {
      const csvText = `raceId,season,round,circuitId,driverId,position,q1,q2,q3
2026_01,2026,1,albert_park,max_verstappen,1,1:18.456,1:17.890,1:17.123
2026_01,2026,1,albert_park,lance_stroll,10,1:19.345,1:18.589,1:18.123`;

      const results = parseCSV(csvText);
      const ds = new DataStore();
      const transformed = ds.transformCSVQualifying(results);

      expect(transformed).toHaveLength(2);
      expect(transformed[0].q3).toBe('1:17.123');
      expect(transformed[0].position).toBe(1);
    });
  });

  // ─── parseCSV → transformCSVRaces ──────────────────────────────────────────

  describe('Races CSV end-to-end', () => {
    it('marks races with hasResults based on race result data', () => {
      const racesCsv = `season,round,raceName,circuitId,circuitName,locality,country,lat,long,date
2026,1,Australian Grand Prix,albert_park,Albert Park,Melbourne,Australia,-37.84,144.96,2026-03-15
2026,2,Bahrain Grand Prix,bahrain,Bahrain Intl,Sakhir,Bahrain,26.03,50.51,2026-03-29
2026,3,Future GP,future,Future Circuit,City,Country,0,0,2026-08-01`;

      const resultsCsv = `season,round,circuitId,driverId,constructorId,position,grid,points,laps,status,fastestLapRank
2026,1,albert_park,max_verstappen,red_bull,1,1,25,58,Finished,1`;

      const races = parseCSV(racesCsv);
      const results = parseCSV(resultsCsv);

      const ds = new DataStore();
      const transformedResults = ds.transformCSVRaceResults(results);
      const transformedRaces = ds.transformCSVRaces(races, transformedResults);

      expect(transformedRaces[0].hasResults).toBe(true);  // Round 1 has results
      expect(transformedRaces[1].hasResults).toBe(false); // Round 2 has no results
      expect(transformedRaces[2].hasResults).toBe(false); // Round 3 has no results
    });
  });

  // ─── Full pipeline: CSV text → DataStore → indexes → queries ──────────────

  describe('Full CSV → query pipeline', () => {
    it('builds working indexes from parsed CSV data', () => {
      const driversCsv = `driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
max_verstappen,1,VER,Max,Verstappen,1997-09-30,Dutch,url
sergio_perez,11,PER,Sergio,Perez,1990-01-26,Mexican,url`;

      const constructorsCsv = `constructorId,name,nationality,teamPrincipal
red_bull,Red Bull,Austrian,Christian Horner`;

      const standingsCsv = `season,driverId,constructorId,position,points,wins
2026,max_verstappen,red_bull,1,200,5
2026,sergio_perez,red_bull,2,60,0`;

      const constructorStandingsCsv = `season,constructorId,position,points,wins
2026,red_bull,1,260,5`;

      const racesCsv = `season,round,raceName,circuitId,circuitName,locality,country,lat,long,date
2026,1,Australian Grand Prix,albert_park,Albert Park,Melbourne,Australia,-37.84,144.96,2026-03-15`;

      const resultsCsv = `season,round,circuitId,driverId,constructorId,position,grid,points,laps,status,fastestLapRank
2026,1,albert_park,max_verstappen,red_bull,1,1,25,58,Finished,1
2026,1,albert_park,sergio_perez,red_bull,8,9,4,58,Finished,8`;

      const ds = new DataStore();
      ds.season = 2026;

      // Run the full pipeline
      ds.data.constructors = ds.transformCSVConstructors(parseCSV(constructorsCsv));
      ds.data.drivers = ds.transformCSVDrivers(parseCSV(driversCsv), parseCSV(standingsCsv));
      ds.data.raceResults = ds.transformCSVRaceResults(parseCSV(resultsCsv));
      ds.data.qualifying = [];
      ds.data.races = ds.transformCSVRaces(parseCSV(racesCsv), ds.data.raceResults);
      ds.data.driverSeasonSummary = ds.transformCSVDriverStandings(parseCSV(standingsCsv));
      ds.data.constructorSeasonSummary = ds.transformCSVConstructorStandings(parseCSV(constructorStandingsCsv));

      ds.buildIndexes();

      // Verify all query methods work
      expect(ds.indexes.driverById.get('max_verstappen').name).toBe('Max Verstappen');
      expect(ds.getRaceResults('2026_01')).toHaveLength(2);
      expect(ds.getTeammate('max_verstappen').driverId).toBe('sergio_perez');
      expect(ds.getDriverSeasonSummary(2026, 'max_verstappen').points).toBe(200);
      expect(ds.getRacesBySeason(2026)).toHaveLength(1);
    });
  });

  // ─── Quoted CSV fields ─────────────────────────────────────────────────────

  describe('CSV edge cases', () => {
    it('handles quoted fields with commas', () => {
      const csvText = `name,description
"Hamilton, Lewis","Seven-time champion, legend"
Verstappen,Reigning champion`;

      const rows = parseCSV(csvText);
      expect(rows[0].name).toBe('Hamilton, Lewis');
      expect(rows[0].description).toBe('Seven-time champion, legend');
    });

    it('handles escaped quotes in fields', () => {
      const csvText = `name,nickname
"Max ""Mad Max"" Verstappen",Speed King`;

      const rows = parseCSV(csvText);
      expect(rows[0].name).toBe('Max "Mad Max" Verstappen');
    });

    it('handles Windows line endings (\\r\\n)', () => {
      const csvText = 'name,points\r\nVerstappen,200\r\nHamilton,120';
      const rows = parseCSV(csvText);
      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe('Verstappen');
    });

    it('handles empty CSV', () => {
      const rows = parseCSV('');
      expect(rows).toEqual([]);
    });
  });
});
