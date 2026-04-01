// tests/integration/data-store.integration.test.js
// Integration tests for DataStore: CSV transformation → index building → query API

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDataStore } from './helpers.js';
import { SEASON } from './fixtures.js';

describe('DataStore Integration', () => {
  let ds;

  beforeEach(() => {
    ds = createTestDataStore();
  });

  // ─── CSV Transformation ────────────────────────────────────────────────────

  describe('CSV transformation pipeline', () => {
    it('transforms all 10 drivers with correct fields', () => {
      expect(ds.data.drivers).toHaveLength(10);
      const ver = ds.data.drivers.find(d => d.driverId === 'max_verstappen');
      expect(ver).toMatchObject({
        code: 'VER',
        number: 1,
        name: 'Max Verstappen',
        nationality: 'Dutch',
        team: 'Red Bull Racing',
      });
      expect(ver.teamColor).toBe('#3671C6');
      expect(ver.photoUrl).toContain('max_verstappen');
    });

    it('transforms all 5 constructors with team colors', () => {
      expect(ds.data.constructors).toHaveLength(5);
      const fer = ds.data.constructors.find(c => c.constructorId === 'ferrari');
      expect(fer.name).toBe('Ferrari');
      expect(fer.teamColor).toBe('#E8002D');
    });

    it('transforms race results with correct numeric types', () => {
      expect(ds.data.raceResults.length).toBe(30); // 10 drivers × 3 races
      const firstResult = ds.data.raceResults[0];
      expect(typeof firstResult.position).toBe('number');
      expect(typeof firstResult.grid).toBe('number');
      expect(typeof firstResult.points).toBe('number');
      expect(typeof firstResult.laps).toBe('number');
    });

    it('transforms qualifying with q1/q2/q3 fields', () => {
      expect(ds.data.qualifying.length).toBe(30);
      const q = ds.data.qualifying[0];
      expect(q.q1).toBeTruthy();
      expect(q.q2).toBeTruthy();
      expect(q.q3).toBeTruthy();
    });

    it('marks races with results via hasResults flag', () => {
      const racesWithResults = ds.data.races.filter(r => r.hasResults);
      expect(racesWithResults).toHaveLength(3);
    });

    it('generates correct raceId format (season_round)', () => {
      const race1 = ds.data.races.find(r => r.round === 1);
      expect(race1.raceId).toBe('2026_01');
    });

    it('transforms driver standings with numeric points', () => {
      const ver = ds.data.driverSeasonSummary.find(d => d.driverId === 'max_verstappen');
      expect(ver.points).toBe(200);
      expect(ver.wins).toBe(5);
      expect(ver.position).toBe(1);
    });
  });

  // ─── Indexes ───────────────────────────────────────────────────────────────

  describe('Index building', () => {
    it('builds driver-by-id index for all 10 drivers', () => {
      expect(ds.indexes.driverById.size).toBe(10);
      const ver = ds.indexes.driverById.get('max_verstappen');
      expect(ver.name).toBe('Max Verstappen');
    });

    it('builds race-by-id index for all 3 races', () => {
      expect(ds.indexes.raceById.size).toBe(3);
      expect(ds.indexes.raceById.get('2026_01').raceName).toBe('Australian Grand Prix');
    });

    it('builds constructor-by-id index for all 5 constructors', () => {
      expect(ds.indexes.constructorById.size).toBe(5);
      expect(ds.indexes.constructorById.get('ferrari').name).toBe('Ferrari');
    });

    it('builds results-by-race index with 10 results per race', () => {
      expect(ds.indexes.resultsByRace.size).toBe(3);
      expect(ds.indexes.resultsByRace.get('2026_01')).toHaveLength(10);
      expect(ds.indexes.resultsByRace.get('2026_02')).toHaveLength(10);
    });

    it('builds qualifying-by-race index', () => {
      expect(ds.indexes.qualifyingByRace.size).toBe(3);
      expect(ds.indexes.qualifyingByRace.get('2026_01')).toHaveLength(10);
    });

    it('builds driver season summary index with composite key', () => {
      const ver = ds.indexes.driverSeasonSummaryIndex.get('2026_max_verstappen');
      expect(ver.points).toBe(200);
    });

    it('builds races-by-season index', () => {
      const seasonRaces = ds.indexes.racesBySeason.get(SEASON);
      expect(seasonRaces).toHaveLength(3);
    });
  });

  // ─── Query API ─────────────────────────────────────────────────────────────

  describe('Query methods', () => {
    it('getRace returns correct race by id', () => {
      const race = ds.getRace('2026_02');
      expect(race.raceName).toBe('Bahrain Grand Prix');
      expect(race.country).toBe('Bahrain');
    });

    it('getRace returns null for unknown id', () => {
      expect(ds.getRace('nonexistent')).toBeNull();
    });

    it('getRacesBySeason returns races sorted by fixture order', () => {
      const races = ds.getRacesBySeason(SEASON);
      expect(races).toHaveLength(3);
      expect(races[0].round).toBe(1);
      expect(races[2].round).toBe(3);
    });

    it('getRaceResults returns results for a given race', () => {
      const results = ds.getRaceResults('2026_01');
      expect(results).toHaveLength(10);
      expect(results[0].driverId).toBe('max_verstappen');
    });

    it('getRaceResults returns empty array for unknown race', () => {
      expect(ds.getRaceResults('nonexistent')).toEqual([]);
    });

    it('getQualifying returns qualifying results for a race', () => {
      const quali = ds.getQualifying('2026_01');
      expect(quali).toHaveLength(10);
    });

    it('getDriverSeasonSummary returns standings data', () => {
      const summary = ds.getDriverSeasonSummary(SEASON, 'lando_norris');
      expect(summary.points).toBe(150);
      expect(summary.wins).toBe(2);
    });

    it('getDriverSeasonSummary returns null for unknown driver', () => {
      expect(ds.getDriverSeasonSummary(SEASON, 'nobody')).toBeNull();
    });

    it('getTeammate returns the correct teammate', () => {
      const teammate = ds.getTeammate('max_verstappen');
      expect(teammate.driverId).toBe('sergio_perez');
    });

    it('getTeammates returns all teammates', () => {
      const teammates = ds.getTeammates('lando_norris');
      expect(teammates).toHaveLength(1);
      expect(teammates[0].driverId).toBe('oscar_piastri');
    });

    it('getTeammates returns empty for unknown driver', () => {
      expect(ds.getTeammates('nobody')).toEqual([]);
    });

    it('getDriversByTeam groups drivers correctly', () => {
      const byTeam = ds.getDriversByTeam();
      expect(byTeam.get('Ferrari')).toHaveLength(2);
      expect(byTeam.get('Red Bull Racing')).toHaveLength(2);
    });

    it('getTeamCount returns 5 teams', () => {
      expect(ds.getTeamCount()).toBe(5);
    });

    it('getTeams returns all 5 team names', () => {
      const teams = ds.getTeams();
      expect(teams).toHaveLength(5);
      expect(teams).toContain('Ferrari');
      expect(teams).toContain('McLaren');
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('handles DNF results with status string intact', () => {
      const bahrain = ds.getRaceResults('2026_02');
      const perez = bahrain.find(r => r.driverId === 'sergio_perez');
      expect(perez.status).toBe('Engine');
      expect(perez.position).toBe(20);
    });

    it('handles Disqualified results', () => {
      const jeddah = ds.getRaceResults('2026_03');
      const norris = jeddah.find(r => r.driverId === 'lando_norris');
      expect(norris.status).toBe('Disqualified');
    });

    it('handles null fastestLapRank gracefully', () => {
      const bahrain = ds.getRaceResults('2026_02');
      const perez = bahrain.find(r => r.driverId === 'sergio_perez');
      expect(perez.fastestLapRank).toBeNull();
    });

    it('getDriverImageUrl returns expected path', () => {
      expect(ds.getDriverImageUrl('max_verstappen')).toBe('data/images/drivers/max_verstappen.jpg');
    });

    it('getConstructorLogoUrl returns expected path', () => {
      expect(ds.getConstructorLogoUrl('ferrari')).toBe('data/images/constructors/ferrari.png');
    });

    it('getConstructorLogoWithFallback provides three format options', () => {
      const urls = ds.getConstructorLogoWithFallback('ferrari');
      expect(urls.primary).toContain('.png');
      expect(urls.fallback1).toContain('.jpg');
      expect(urls.fallback2).toContain('.svg');
    });
  });

  // ─── Season management ─────────────────────────────────────────────────────

  describe('Season switching', () => {
    it('setSeason changes season and marks store as not loaded', () => {
      ds.setSeason(2025);
      expect(ds.season).toBe(2025);
      expect(ds.loaded).toBe(false);
    });

    it('setSeason with same season does not reset loaded flag', () => {
      ds.loaded = true;
      ds.setSeason(SEASON);
      expect(ds.loaded).toBe(true);
    });

    it('setSeason parses string input', () => {
      ds.setSeason('2025');
      expect(ds.season).toBe(2025);
    });
  });
});
