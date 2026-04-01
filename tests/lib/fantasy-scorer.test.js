import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FantasyScorer } from '../../lib/fantasy-scorer.js';
import { DEFAULT_FANTASY_SCORING } from '../../lib/fantasy-scoring-config.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDataStore({
  raceResults = [],
  qualifying = [],
  race = null,
  sprintResults = [],
  driverTeams = []
} = {}) {
  return {
    getRaceResults: vi.fn(() => raceResults),
    getQualifying: vi.fn(() => qualifying),
    getRace: vi.fn(() => race),
    data: { sprintResults, driverTeams }
  };
}

/** Creates a minimal race-result row for driver_a by default */
function makeResult(overrides = {}) {
  return {
    driverId: 'driver_a',
    position: '1',
    status: 'Finished',
    fastestLapRank: null,
    positionOrder: '1',
    ...overrides
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('FantasyScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new FantasyScorer();
  });

  // ─── Participation ──────────────────────────────────────────────────────────

  describe('scoreDriverRace - participation', () => {
    it('returns total 0 and participated=false when driver has no result', () => {
      const ds = makeDataStore({ raceResults: [] });
      const result = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(result.participated).toBe(false);
      expect(result.total).toBe(0);
    });

    it('returns participated=true when driver has a result', () => {
      const ds = makeDataStore({ raceResults: [makeResult()] });
      const result = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(result.participated).toBe(true);
    });

    it('returns all-zero breakdown when not participated', () => {
      const ds = makeDataStore({ raceResults: [] });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      for (const val of Object.values(breakdown)) {
        expect(val).toBe(0);
      }
    });
  });

  // ─── Race position points ───────────────────────────────────────────────────

  describe('scoreDriverRace - race position', () => {
    it.each([
      [1, 25], [2, 18], [3, 15], [4, 12], [5, 10],
      [6, 8],  [7, 6],  [8, 4],  [9, 2],  [10, 1],
    ])('P%i awards %i race-position points', (pos, pts) => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: String(pos) })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.racePosition).toBe(pts);
    });

    it('P11 yields 0 race-position points', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '11' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.racePosition).toBe(0);
    });
  });

  // ─── Qualifying bonus ───────────────────────────────────────────────────────

  describe('scoreDriverRace - qualifying bonus', () => {
    it.each([
      [1, 5], [2, 3], [3, 2], [4, 1], [5, 1],
    ])('Q%i awards qualifying bonus of %i', (qPos, bonus) => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5' })],
        qualifying: [{ driverId: 'driver_a', position: String(qPos) }]
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.qualifyingBonus).toBe(bonus);
    });

    it('Q6 awards 0 qualifying bonus', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5' })],
        qualifying: [{ driverId: 'driver_a', position: '6' }]
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.qualifyingBonus).toBe(0);
    });

    it('awards 0 qualifying bonus when driver absent from qualifying', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '1' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.qualifyingBonus).toBe(0);
    });

    it('skips qualifying bonus when configured as disabled', () => {
      const config = {
        ...DEFAULT_FANTASY_SCORING,
        qualifyingBonus: { ...DEFAULT_FANTASY_SCORING.qualifyingBonus, enabled: false }
      };
      scorer = new FantasyScorer(config);
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '1' })],
        qualifying: [{ driverId: 'driver_a', position: '1' }]
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.qualifyingBonus).toBe(0);
    });
  });

  // ─── Fastest lap ────────────────────────────────────────────────────────────

  describe('scoreDriverRace - fastest lap', () => {
    it('awards fastest-lap bonus for fastestLapRank = 1 (number)', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '3', fastestLapRank: 1 })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.fastestLap).toBe(2);
    });

    it('awards fastest-lap bonus for fastestLapRank = "1" (string)', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5', fastestLapRank: '1' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.fastestLap).toBe(2);
    });

    it('does not award fastest-lap bonus for rank 2', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '1', fastestLapRank: 2 })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.fastestLap).toBe(0);
    });

    it('withholds fastest-lap bonus for P11 when requiresTopTenFinish is true', () => {
      scorer = new FantasyScorer({
        ...DEFAULT_FANTASY_SCORING,
        bonuses: {
          ...DEFAULT_FANTASY_SCORING.bonuses,
          fastestLap: { enabled: true, points: 2, requiresTopTenFinish: true }
        }
      });
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '11', fastestLapRank: 1 })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.fastestLap).toBe(0);
    });

    it('awards fastest-lap bonus for P10 when requiresTopTenFinish is true', () => {
      scorer = new FantasyScorer({
        ...DEFAULT_FANTASY_SCORING,
        bonuses: {
          ...DEFAULT_FANTASY_SCORING.bonuses,
          fastestLap: { enabled: true, points: 2, requiresTopTenFinish: true }
        }
      });
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '10', fastestLapRank: 1 })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.fastestLap).toBe(2);
    });
  });

  // ─── Podium bonus ───────────────────────────────────────────────────────────

  describe('scoreDriverRace - podium bonus', () => {
    const podiumConfig = {
      ...DEFAULT_FANTASY_SCORING,
      bonuses: {
        ...DEFAULT_FANTASY_SCORING.bonuses,
        podium: { enabled: true, points: 3 }
      }
    };

    it.each([[1], [2], [3]])('awards podium bonus for P%i when enabled', (pos) => {
      scorer = new FantasyScorer(podiumConfig);
      const ds = makeDataStore({
        raceResults: [makeResult({ position: String(pos) })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.podium).toBe(3);
    });

    it('does not award podium bonus for P4 when enabled', () => {
      scorer = new FantasyScorer(podiumConfig);
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '4' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.podium).toBe(0);
    });

    it('does not award podium bonus when disabled (default config)', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '1' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.podium).toBe(0);
    });
  });

  // ─── Penalties ──────────────────────────────────────────────────────────────

  describe('scoreDriverRace - penalties', () => {
    it.each([
      'Accident', 'Collision', 'Engine', 'Gearbox', 'Transmission',
      'Clutch', 'Hydraulics', 'Electrical', 'Retired', 'Spun off',
      'Fuel pressure', 'Brakes', 'Suspension', 'Wheel', 'Radiator',
      'Safety concerns',
    ])('applies DNF penalty (-5) for status "%s"', (status) => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '15', status })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.dnfPenalty).toBe(-5);
      expect(breakdown.disqualifiedPenalty).toBe(0);
    });

    it('applies disqualification penalty (-10) and no DNF penalty', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '1', status: 'Disqualified' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.disqualifiedPenalty).toBe(-10);
      expect(breakdown.dnfPenalty).toBe(0);
    });

    it('applies DNS penalty (-3) for "Did not start"', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '20', status: 'Did not start' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.dnsPenalty).toBe(-3);
    });

    it('applies DNS penalty (-3) for "Withdrew"', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '20', status: 'Withdrew' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.dnsPenalty).toBe(-3);
    });

    it('applies no penalty for status "Finished"', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5', status: 'Finished' })],
        qualifying: []
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.dnfPenalty).toBe(0);
      expect(breakdown.disqualifiedPenalty).toBe(0);
      expect(breakdown.dnsPenalty).toBe(0);
    });
  });

  // ─── Total calculation ──────────────────────────────────────────────────────

  describe('scoreDriverRace - total', () => {
    it('total equals sum of all breakdown values', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '3', status: 'Finished' })],
        qualifying: [{ driverId: 'driver_a', position: '2' }]
      });
      const { total, breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      const expected = Object.values(breakdown).reduce((a, b) => a + b, 0);
      expect(total).toBe(expected);
    });

    it('P1 + pole + fastest lap = 32 points', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '1', fastestLapRank: 1 })],
        qualifying: [{ driverId: 'driver_a', position: '1' }]
      });
      const { total, breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.racePosition).toBe(25);
      expect(breakdown.qualifyingBonus).toBe(5);
      expect(breakdown.fastestLap).toBe(2);
      expect(total).toBe(32);
    });

    it('DNF from P18 with no qualifying = -5 total', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '18', status: 'Engine' })],
        qualifying: []
      });
      const { total } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(total).toBe(-5);
    });
  });

  // ─── isDNF ──────────────────────────────────────────────────────────────────

  describe('isDNF', () => {
    it.each([
      'Accident', 'Collision', 'Engine', 'Gearbox', 'Transmission',
      'Clutch', 'Hydraulics', 'Electrical', 'Retired', 'Spun off',
      'Fuel pressure', 'Brakes', 'Suspension', 'Wheel', 'Radiator',
      'Safety concerns', 'Excluded',
    ])('returns true for "%s"', (status) => {
      expect(scorer.isDNF(status)).toBe(true);
    });

    it.each(['Finished', 'Did not start', 'Withdrew', '+1 Lap', '+2 Laps'])(
      'returns false for "%s"',
      (status) => {
        expect(scorer.isDNF(status)).toBe(false);
      }
    );
  });

  // ─── scoreRace ──────────────────────────────────────────────────────────────

  describe('scoreRace', () => {
    it('returns a score entry for every driver in the race', () => {
      const ds = makeDataStore({
        raceResults: [
          makeResult({ driverId: 'driver_a', position: '1' }),
          makeResult({ driverId: 'driver_b', position: '2' })
        ],
        qualifying: []
      });
      const results = scorer.scoreRace('race_1', ds);
      expect(results).toHaveLength(2);
      expect(results[0].driverId).toBe('driver_a');
      expect(results[0].total).toBe(25);
      expect(results[1].driverId).toBe('driver_b');
      expect(results[1].total).toBe(18);
    });

    it('returns an empty array when no race results exist', () => {
      const ds = makeDataStore({ raceResults: [] });
      expect(scorer.scoreRace('race_1', ds)).toHaveLength(0);
    });
  });

  // ─── beatTeammate bonus ────────────────────────────────────────────────────

  describe('scoreDriverRace - beatTeammate bonus', () => {
    function makeScorerWithBeatTeammate() {
      return new FantasyScorer({
        ...DEFAULT_FANTASY_SCORING,
        bonuses: {
          ...DEFAULT_FANTASY_SCORING.bonuses,
          beatTeammate: { enabled: true, points: 3 }
        }
      });
    }

    it('awards beatTeammate bonus when driver finishes ahead of teammate', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [
          { driverId: 'driver_a', position: '2', status: 'Finished', positionOrder: '2' },
          { driverId: 'driver_b', position: '5', status: 'Finished', positionOrder: '5' }
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      const s = makeScorerWithBeatTeammate();
      const { breakdown } = s.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.beatTeammate).toBe(3);
    });

    it('does not award beatTeammate bonus when driver finishes behind teammate', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [
          { driverId: 'driver_a', position: '8', status: 'Finished', positionOrder: '8' },
          { driverId: 'driver_b', position: '3', status: 'Finished', positionOrder: '3' }
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      const s = makeScorerWithBeatTeammate();
      const { breakdown } = s.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.beatTeammate).toBe(0);
    });
  });

  // ─── checkBeatTeammate ────────────────────────────────────────────────────

  describe('checkBeatTeammate', () => {
    it('returns false when race is not found', () => {
      const ds = makeDataStore({ race: null });
      expect(scorer.checkBeatTeammate('race_x', 'driver_a', makeResult(), ds)).toBe(false);
    });

    it('returns false when driver has no driverTeams entry', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        driverTeams: [] // no entry for driver_a
      });
      expect(scorer.checkBeatTeammate('race_1', 'driver_a', makeResult(), ds)).toBe(false);
    });

    it('returns false when driver has no teammates on the same constructor', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_solo', season: '2026' }
          // no teammate on team_solo
        ]
      });
      expect(scorer.checkBeatTeammate('race_1', 'driver_a', makeResult(), ds)).toBe(false);
    });

    it('returns true when teammate did not participate', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [ // teammate driver_b absent
          { driverId: 'driver_a', positionOrder: '3', status: 'Finished' }
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      expect(scorer.checkBeatTeammate('race_1', 'driver_a', makeResult({ positionOrder: '3' }), ds)).toBe(true);
    });

    it('returns true when driver finishes ahead of teammate', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [
          { driverId: 'driver_a', positionOrder: '2', status: 'Finished' },
          { driverId: 'driver_b', positionOrder: '7', status: 'Finished' }
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      expect(
        scorer.checkBeatTeammate('race_1', 'driver_a', makeResult({ positionOrder: '2' }), ds)
      ).toBe(true);
    });

    it('returns false when driver finishes behind teammate', () => {
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [
          { driverId: 'driver_a', positionOrder: '10', status: 'Finished' },
          { driverId: 'driver_b', positionOrder: '4',  status: 'Finished' }
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      expect(
        scorer.checkBeatTeammate('race_1', 'driver_a', makeResult({ positionOrder: '10' }), ds)
      ).toBe(false);
    });

    it('returns false when driver has no positionOrder (treated as 999)', () => {
      // Covers the `parseInt(driverResult.positionOrder) || 999` fallback branch
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [
          { driverId: 'driver_a', status: 'Retired' },          // no positionOrder → 999
          { driverId: 'driver_b', positionOrder: '5', status: 'Finished' }
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      expect(
        scorer.checkBeatTeammate('race_1', 'driver_a', makeResult({ positionOrder: undefined }), ds)
      ).toBe(false);
    });

    it('returns true when teammate has no positionOrder (treated as 999)', () => {
      // Covers the `parseInt(teammateResult.positionOrder) || 999` fallback branch
      const ds = makeDataStore({
        race: { raceId: 'race_1', season: 2026 },
        raceResults: [
          { driverId: 'driver_a', positionOrder: '3', status: 'Finished' },
          { driverId: 'driver_b', status: 'Retired' }           // no positionOrder → 999
        ],
        driverTeams: [
          { driverId: 'driver_a', constructorId: 'team_x', season: '2026' },
          { driverId: 'driver_b', constructorId: 'team_x', season: '2026' }
        ]
      });
      expect(
        scorer.checkBeatTeammate('race_1', 'driver_a', makeResult({ positionOrder: '3' }), ds)
      ).toBe(true);
    });
  });

  // ─── Sprint position points ────────────────────────────────────────────────

  describe('scoreDriverRace - sprint position', () => {
    it('awards sprint points when the race has a sprint and driver has a sprint result', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5' })],
        race: { hasSprint: 'true' },
        sprintResults: [{ raceId: 'race_1', driverId: 'driver_a', position: '1' }]
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      // DEFAULT_FANTASY_SCORING sprintPosition[1] = 8
      expect(breakdown.sprintPosition).toBe(8);
    });

    it('awards 0 sprint points when the race has no sprint', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5' })],
        race: { hasSprint: 'false' },
        sprintResults: [{ raceId: 'race_1', driverId: 'driver_a', position: '1' }]
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.sprintPosition).toBe(0);
    });

    it('awards 0 sprint points when driver has no sprint result', () => {
      const ds = makeDataStore({
        raceResults: [makeResult({ position: '5' })],
        race: { hasSprint: 'true' },
        sprintResults: [] // no sprint result for driver_a
      });
      const { breakdown } = scorer.scoreDriverRace('race_1', 'driver_a', ds);
      expect(breakdown.sprintPosition).toBe(0);
    });
  });
});
