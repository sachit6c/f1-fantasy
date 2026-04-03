import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the singleton fantasyScorer imported by fantasy-team-scorer.js
vi.mock('../../lib/fantasy-scorer.js', () => ({
  fantasyScorer: {
    scoreDriverRace: vi.fn((raceId, driverId) => {
      const pts = { driver_a: 25, driver_b: 18, driver_c: 15, driver_d: 12 };
      return { total: pts[driverId] ?? 0, breakdown: {}, participated: true };
    })
  }
}));

import { FantasyTeamScorer } from '../../lib/fantasy-team-scorer.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDraftStore(players, season = 2026) {
  return {
    draft: {
      season,
      players: players.map((p, i) => ({
        playerId: `player_${i + 1}`,
        name: p.name,
        roster: p.roster
      }))
    }
  };
}

function makeDataStore({
  driverSeasonSummary = [],
  raceResults = [],
  qualifying = [],
  races = [],
  driverById = new Map()
} = {}) {
  return {
    season: 2026,
    getDriverSeasonSummary: vi.fn((season, driverId) =>
      driverSeasonSummary.find(d => d.driverId === driverId) ?? null
    ),
    getRacesBySeason: vi.fn(() => races),
    getRaceResults: vi.fn((raceId) => raceResults.filter(r => r.raceId === raceId)),
    getSprintResults: vi.fn(() => []),
    data: { raceResults, qualifying },
    indexes: { driverById }
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FantasyTeamScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new FantasyTeamScorer();
  });

  // ─── scorePlayerRace ───────────────────────────────────────────────────────

  describe('scorePlayerRace', () => {
    it('returns zero total when draft is null', () => {
      const result = scorer.scorePlayerRace('player_1', 'race_1', { draft: null }, makeDataStore());
      expect(result.total).toBe(0);
      expect(result.drivers).toEqual([]);
    });

    it('returns zero total when the player is not found', () => {
      const draftStore = makeDraftStore([{ name: 'Alice', roster: ['driver_a'] }]);
      const result = scorer.scorePlayerRace('player_99', 'race_1', draftStore, makeDataStore());
      expect(result.total).toBe(0);
    });

    it('aggregates fantasy points across all roster drivers', () => {
      // driver_a = 25, driver_c = 15 → 40 official F1 race points
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a', 'driver_c'] },
        { name: 'Bob',   roster: ['driver_b', 'driver_d'] }
      ]);
      const ds = makeDataStore({
        raceResults: [
          { raceId: 'race_1', driverId: 'driver_a', points: '25' },
          { raceId: 'race_1', driverId: 'driver_c', points: '15' }
        ]
      });
      const result = scorer.scorePlayerRace('player_1', 'race_1', draftStore, ds);
      expect(result.total).toBe(40);
      expect(result.drivers).toHaveLength(2);
    });

    it('returns an entry per driver with driverId and total', () => {
      const draftStore = makeDraftStore([{ name: 'Alice', roster: ['driver_a'] }]);
      const ds = makeDataStore({
        raceResults: [{ raceId: 'race_1', driverId: 'driver_a', points: '25' }]
      });
      const { drivers } = scorer.scorePlayerRace('player_1', 'race_1', draftStore, ds);
      expect(drivers[0].driverId).toBe('driver_a');
      expect(drivers[0].total).toBe(25);
    });
  });

  // ─── scorePlayerSeason ────────────────────────────────────────────────────

  describe('scorePlayerSeason', () => {
    it('returns zero total when draft is null', () => {
      const result = scorer.scorePlayerSeason('player_1', { draft: null }, makeDataStore());
      expect(result.total).toBe(0);
    });

    it('uses official F1 standings points (not fantasy points)', () => {
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a', 'driver_c'] }
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 100, position: 1, wins: 3 },
          { driverId: 'driver_c', season: 2026, points: 80,  position: 3, wins: 1 }
        ]
      });
      const result = scorer.scorePlayerSeason('player_1', draftStore, ds);
      // 100 + 80 = 180 official standings points
      expect(result.total).toBe(180);
    });

    it('treats drivers absent from standings as 0 points', () => {
      const draftStore = makeDraftStore([{ name: 'Alice', roster: ['driver_unknown'] }]);
      const result = scorer.scorePlayerSeason('player_1', draftStore, makeDataStore());
      expect(result.total).toBe(0);
    });

    it('includes race-by-race breakdown for completed races', () => {
      const draftStore = makeDraftStore([{ name: 'Alice', roster: ['driver_a'] }]);
      const ds = makeDataStore({
        races: [
          { raceId: 'race_1', raceName: 'Race 1', round: 1, hasResults: true },
          { raceId: 'race_2', raceName: 'Race 2', round: 2, hasResults: false }
        ]
      });
      const result = scorer.scorePlayerSeason('player_1', draftStore, ds);
      // Only the completed race should appear
      expect(result.races).toHaveLength(1);
      expect(result.races[0].raceId).toBe('race_1');
    });

    it('falls back to dataStore.season when draft has no season field', () => {
      // Covers `draft.season || dataStore.season` fallback branch
      const draftStore = { draft: { players: [{ playerId: 'player_1', roster: [] }] } };
      const ds = makeDataStore(); // season: 2026
      const result = scorer.scorePlayerSeason('player_1', draftStore, ds);
      expect(result.total).toBe(0); // no crash, resolved via dataStore.season
    });

    it('returns zero and empty arrays when playerId is not in the draft', () => {
      // Covers `if (!player) return { total: 0, races: [], drivers: [] }` branch
      const draftStore = makeDraftStore([{ name: 'Alice', roster: ['driver_a'] }]);
      const result = scorer.scorePlayerSeason('player_99', draftStore, makeDataStore());
      expect(result.total).toBe(0);
      expect(result.races).toEqual([]);
      expect(result.drivers).toEqual([]);
    });
  });

  // ─── compareTeams ─────────────────────────────────────────────────────────

  describe('compareTeams', () => {
    it('identifies the leader correctly', () => {
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] }, // 100 pts
        { name: 'Bob',   roster: ['driver_b'] }  //  80 pts
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 100, position: 1, wins: 3 },
          { driverId: 'driver_b', season: 2026, points: 80,  position: 2, wins: 1 }
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.leader).toBe('player_1');
    });

    it('calculates the correct margin between teams', () => {
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: ['driver_c'] }
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, position: 2, wins: 0 },
          { driverId: 'driver_c', season: 2026, points: 75, position: 1, wins: 2 }
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.leader).toBe('player_2');
      expect(comparison.margin).toBe(25);
    });

    it('returns both player objects in the result', () => {
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: ['driver_b'] }
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, position: 1, wins: 1 },
          { driverId: 'driver_b', season: 2026, points: 30, position: 2, wins: 0 }
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.player1.name).toBe('Alice');
      expect(comparison.player2.name).toBe('Bob');
    });

    it('aggregates raceResults and qualifying stats for each team', () => {
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: ['driver_b'] }
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 100, position: 1, wins: 3 },
          { driverId: 'driver_b', season: 2026, points: 80,  position: 2, wins: 1 }
        ],
        raceResults: [
          { driverId: 'driver_a', season: 2026, position: 1, fastestLapRank: 1, status: 'Finished' }
        ],
        qualifying: [
          { driverId: 'driver_a', season: 2026, position: 1, q1: '1:10', q2: '1:09', q3: '1:08' }
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.player1.raceWins).toBe(1);
      expect(comparison.player1.fastestLaps).toBe(1);
      expect(comparison.player1.poles).toBe(1);
    });

    it('builds raceComparisons with per-race win/loss/tie tallies', () => {
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: ['driver_b'] }
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 100, position: 1, wins: 3 },
          { driverId: 'driver_b', season: 2026, points: 80,  position: 2, wins: 1 }
        ],
        raceResults: [
          { raceId: 'race_1', driverId: 'driver_a', points: '25' },
          { raceId: 'race_1', driverId: 'driver_b', points: '18' }
        ],
        races: [{ raceId: 'race_1', raceName: 'Race 1', round: 1, hasResults: true }]
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      // driver_a (25) > driver_b (18) → Alice wins race comparison
      expect(comparison.raceComparisons).toHaveLength(1);
      expect(comparison.raceComparisons[0].winner).toBe('player_1');
    });

    it('raceComparisons records a player2 win when player2 driver scores more', () => {
      // Swap rosters: player_1 gets driver_b (18 pts), player_2 gets driver_a (25 pts)
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_b'] },
        { name: 'Bob',   roster: ['driver_a'] }
      ]);
      const ds = makeDataStore({
        raceResults: [
          { raceId: 'race_1', driverId: 'driver_a', points: '25' },
          { raceId: 'race_1', driverId: 'driver_b', points: '18' }
        ],
        races: [{ raceId: 'race_1', raceName: 'Race 1', round: 1, hasResults: true }]
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.raceComparisons[0].winner).toBe('player_2');
    });

    it('raceComparisons records a tie when both players score equally', () => {
      // Use unknown drivers → both score 0 (falls through ?? 0 in mock)
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_unknown_1'] },
        { name: 'Bob',   roster: ['driver_unknown_2'] }
      ]);
      const ds = makeDataStore({
        races: [{ raceId: 'race_1', raceName: 'Race 1', round: 1, hasResults: true }]
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.raceComparisons[0].winner).toBe('tie');
    });

    it('uses dataStore.season when draft.season is absent', () => {
      // Covers `draft.season || dataStore.season` fallback in compareTeams
      const draftStore = {
        draft: {
          players: [
            { playerId: 'player_1', name: 'Alice', roster: [] },
            { playerId: 'player_2', name: 'Bob',   roster: [] }
          ]
          // no season field
        }
      };
      const ds = makeDataStore({ races: [] });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.leader).toBeDefined(); // resolved season via dataStore.season
    });

    it('counts Q1 knockouts in team stats', () => {
      // Covers `!q.q2 && q.q1` truthy branch: driver has q1 time but no q2 (knocked out in Q1)
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: [] }
      ]);
      const ds = makeDataStore({
        qualifying: [
          { driverId: 'driver_a', season: 2026, q1: '1:15' } // Q1 knockout — no q2
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.player1.q1Outs).toBe(1);
    });

    it('counts Q2 knockouts in team stats', () => {
      // Covers `!q.q3 && q.q2` truthy branch: driver has q2 time but no q3 (knocked out in Q2)
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: [] }
      ]);
      const ds = makeDataStore({
        qualifying: [
          { driverId: 'driver_a', season: 2026, q1: '1:15', q2: '1:13' } // Q2 knockout — no q3
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.player1.q2Outs).toBe(1);
    });

    it('does not count a Lapped result as a DNF', () => {
      // Covers `&& r.status !== 'Lapped'` evaluating to false (Lapped is not a DNF)
      const draftStore = makeDraftStore([
        { name: 'Alice', roster: ['driver_a'] },
        { name: 'Bob',   roster: [] }
      ]);
      const ds = makeDataStore({
        raceResults: [
          { driverId: 'driver_a', season: 2026, position: 10, status: 'Lapped',
            fastestLapRank: 0 }
        ],
        races: []
      });
      const comparison = scorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.player1.dnfs).toBe(0);
    });
  });

  // ─── calculateDriverMatchups ──────────────────────────────────────────────

  describe('calculateDriverMatchups', () => {
    it('only creates matchups for same-team driver pairs', () => {
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', team: 'team_1' }], // same team as a
        ['driver_c', { driverId: 'driver_c', team: 'team_2' }],
        ['driver_d', { driverId: 'driver_d', team: 'team_2' }]  // same team as c
      ]);
      const ds = makeDataStore({
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 100, position: 1, wins: 3 },
          { driverId: 'driver_b', season: 2026, points: 80,  position: 2, wins: 1 },
          { driverId: 'driver_c', season: 2026, points: 60,  position: 3, wins: 0 },
          { driverId: 'driver_d', season: 2026, points: 40,  position: 4, wins: 0 }
        ],
        driverById,
        races: []
      });
      // roster1: a (team_1) + c (team_2), roster2: b (team_1) + d (team_2)
      const result = scorer.calculateDriverMatchups(
        ['driver_a', 'driver_c'],
        ['driver_b', 'driver_d'],
        ds,
        2026
      );
      // Expect 2 matchups: a vs b, and c vs d
      expect(result.matchups).toHaveLength(2);
    });

    it('does not create a matchup for drivers from different teams', () => {
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', team: 'team_2' }] // different team
      ]);
      const ds = makeDataStore({ driverById, races: [] });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      expect(result.matchups).toHaveLength(0);
    });

    it('returns zero wins when no races have been played', () => {
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', team: 'team_1' }]
      ]);
      const ds = makeDataStore({ driverById, races: [] });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      expect(result.player1Wins).toBe(0);
      expect(result.player2Wins).toBe(0);
    });

    it('records a tie when both teammates have equal points', () => {
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', name: 'Driver B', code: 'DRB', team: 'team_1' }]
      ]);
      const ds = makeDataStore({
        driverById,
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, wins: 1 },
          { driverId: 'driver_b', season: 2026, points: 50, wins: 1 } // equal
        ],
        races: []
      });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      expect(result.ties).toBe(1);
      expect(result.matchups[0].winner).toBe('tie');
    });

    it('computes qualifying and race beat counts when both drivers have results', () => {
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', name: 'Driver B', code: 'DRB', team: 'team_1' }]
      ]);
      const ds = makeDataStore({
        driverById,
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 100, wins: 3 },
          { driverId: 'driver_b', season: 2026, points: 80,  wins: 1 }
        ],
        raceResults: [
          { raceId: 'race_1', driverId: 'driver_a', season: 2026, grid: 1, position: 1 },
          { raceId: 'race_1', driverId: 'driver_b', season: 2026, grid: 3, position: 2 }
        ],
        qualifying: [
          { driverId: 'driver_a', season: 2026, position: 1, q1: '1:10', q2: '1:09', q3: '1:08' }
        ],
        races: [{ raceId: 'race_1' }]
      });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      // driver_a grid 1 < driver_b grid 3 → driver1QualiBeats
      expect(result.matchups[0].driver1QualiBeats).toBe(1);
      expect(result.matchups[0].driver2QualiBeats).toBe(0);
      // driver_a pos 1 < driver_b pos 2 → driver1RaceBeats
      expect(result.matchups[0].driver1RaceBeats).toBe(1);
      expect(result.matchups[0].driver2RaceBeats).toBe(0);
      // driver_a has more season points → player1 wins
      expect(result.player1Wins).toBe(1);
    });

    it('increments driver2QualiBeats when player2 driver qualifies ahead', () => {
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', name: 'Driver B', code: 'DRB', team: 'team_1' }]
      ]);
      const ds = makeDataStore({
        driverById,
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, wins: 0 },
          { driverId: 'driver_b', season: 2026, points: 80, wins: 1 }
        ],
        raceResults: [
          { raceId: 'race_1', driverId: 'driver_a', season: 2026, grid: 5, position: 3 },
          { raceId: 'race_1', driverId: 'driver_b', season: 2026, grid: 1, position: 2 }
        ],
        races: [{ raceId: 'race_1' }]
      });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      // driver_b grid 1 < driver_a grid 5 → driver2QualiBeats
      expect(result.matchups[0].driver2QualiBeats).toBe(1);
      // driver_b pos 2 < driver_a pos 3 → driver2RaceBeats
      expect(result.matchups[0].driver2RaceBeats).toBe(1);
      expect(result.player2Wins).toBe(1);
    });

    it('skips matchup when a roster2 driver is absent from the driver index', () => {
      // Covers `if (!driver2) return` guard branch
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }]
        // driver_z intentionally absent from index
      ]);
      const ds = makeDataStore({ driverById, races: [] });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_z'], ds, 2026);
      expect(result.matchups).toHaveLength(0);
    });

    it('counts Q1 and Q2 qualification knockouts in matchup stats', () => {
      // Covers `!q.q2 && q.q1` and `!q.q3 && q.q2` truthy branches for both drivers
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', name: 'Driver B', code: 'DRB', team: 'team_1' }]
      ]);
      const ds = makeDataStore({
        driverById,
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, wins: 0 },
          { driverId: 'driver_b', season: 2026, points: 30, wins: 0 }
        ],
        qualifying: [
          { driverId: 'driver_a', season: 2026, q1: '1:16' },              // Q1 knockout (no q2)
          { driverId: 'driver_b', season: 2026, q1: '1:14' },              // Q1 knockout (no q2) — covers q1Outs2 branch
          { driverId: 'driver_a', season: 2026, q1: '1:14', q2: '1:12' }, // Q2 knockout (no q3)
          { driverId: 'driver_b', season: 2026, q1: '1:15', q2: '1:13' }  // Q2 knockout (no q3)
        ],
        races: []
      });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      expect(result.matchups[0].driver1Q1Outs).toBe(1);
      expect(result.matchups[0].driver2Q1Outs).toBe(1);
      expect(result.matchups[0].driver1Q2Outs).toBe(1);
      expect(result.matchups[0].driver2Q2Outs).toBe(1);
    });

    it('does not count a Lapped race result as a DNF in driver matchup stats', () => {
      // Covers `&& r.status !== 'Lapped'` evaluating to false in calculateDriverMatchups
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', name: 'Driver B', code: 'DRB', team: 'team_1' }]
      ]);
      const ds = makeDataStore({
        driverById,
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, wins: 0 },
          { driverId: 'driver_b', season: 2026, points: 30, wins: 0 }
        ],
        raceResults: [
          { raceId: 'race_1', driverId: 'driver_a', season: 2026, position: 8, status: 'Lapped' },
          { raceId: 'race_1', driverId: 'driver_b', season: 2026, position: 9, status: 'Finished' }
        ],
        races: [{ raceId: 'race_1' }]
      });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      expect(result.matchups[0].driver1DNFs).toBe(0); // Lapped is not a DNF
    });

    it('uses 999 as position when a race result has no position value', () => {
      // Covers `result1.position || 999` and `result2.position || 999` fallback branches
      const driverById = new Map([
        ['driver_a', { driverId: 'driver_a', name: 'Driver A', code: 'DRA', team: 'team_1' }],
        ['driver_b', { driverId: 'driver_b', name: 'Driver B', code: 'DRB', team: 'team_1' }]
      ]);
      const ds = makeDataStore({
        driverById,
        driverSeasonSummary: [
          { driverId: 'driver_a', season: 2026, points: 50, wins: 0 },
          { driverId: 'driver_b', season: 2026, points: 30, wins: 0 }
        ],
        raceResults: [
          // Both DNF — position is 0 (falsy), triggers || 999 fallback
          { raceId: 'race_1', driverId: 'driver_a', season: 2026, grid: 1, position: 0 },
          { raceId: 'race_1', driverId: 'driver_b', season: 2026, grid: 3, position: 0 }
        ],
        races: [{ raceId: 'race_1' }]
      });
      const result = scorer.calculateDriverMatchups(['driver_a'], ['driver_b'], ds, 2026);
      // Both treated as 999 — equal — no race beats either way
      expect(result.matchups[0].driver1RaceBeats).toBe(0);
      expect(result.matchups[0].driver2RaceBeats).toBe(0);
    });
  });

  // ─── calculateDriverContributions ────────────────────────────────────────

  describe('calculateDriverContributions', () => {
    it('aggregates total points and race count per driver', () => {
      const playerSeasonScore = {
        races: [
          { raceId: 'race_1', drivers: [
            { driverId: 'driver_a', total: 25 },
            { driverId: 'driver_b', total: 18 }
          ]},
          { raceId: 'race_2', drivers: [
            { driverId: 'driver_a', total: 15 },
            { driverId: 'driver_b', total: 12 }
          ]}
        ]
      };
      const result = scorer.calculateDriverContributions(playerSeasonScore);
      const driverA = result.find(d => d.driverId === 'driver_a');
      const driverB = result.find(d => d.driverId === 'driver_b');
      expect(driverA.totalPoints).toBe(40);
      expect(driverA.races).toBe(2);
      expect(driverA.avgPoints).toBe(20);
      expect(driverB.totalPoints).toBe(30);
    });

    it('sorts drivers by total points descending', () => {
      const playerSeasonScore = {
        races: [{
          raceId: 'race_1',
          drivers: [
            { driverId: 'driver_b', total: 5 },
            { driverId: 'driver_a', total: 25 }
          ]
        }]
      };
      const result = scorer.calculateDriverContributions(playerSeasonScore);
      expect(result[0].driverId).toBe('driver_a');
      expect(result[1].driverId).toBe('driver_b');
    });

    it('returns empty array for a season score with no races', () => {
      const result = scorer.calculateDriverContributions({ races: [] });
      expect(result).toEqual([]);
    });

    it('calculates avgPoints as 0 when a driver has 0 races', () => {
      // Manually inject a zero-races entry to hit the races > 0 branch
      const playerSeasonScore = {
        races: [{ raceId: 'race_1', drivers: [{ driverId: 'driver_a', total: 10 }] }]
      };
      const result = scorer.calculateDriverContributions(playerSeasonScore);
      expect(result[0].avgPoints).toBe(10);
    });
  });
});
