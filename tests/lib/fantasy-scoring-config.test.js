import { describe, it, expect } from 'vitest';
import { DEFAULT_FANTASY_SCORING, SCORING_PRESETS } from '../../lib/fantasy-scoring-config.js';

describe('DEFAULT_FANTASY_SCORING', () => {
  // ─── racePosition ─────────────────────────────────────────────────────────────

  describe('racePosition points', () => {
    it.each([
      [1, 25], [2, 18], [3, 15], [4, 12], [5, 10],
      [6, 8],  [7, 6],  [8, 4],  [9, 2],  [10, 1],
    ])('P%i awards %i points', (pos, pts) => {
      expect(DEFAULT_FANTASY_SCORING.racePosition[pos]).toBe(pts);
    });

    it('P11 has no defined points', () => {
      expect(DEFAULT_FANTASY_SCORING.racePosition[11]).toBeUndefined();
    });
  });

  // ─── qualifyingBonus ──────────────────────────────────────────────────────────

  describe('qualifyingBonus', () => {
    it('is enabled', () => {
      expect(DEFAULT_FANTASY_SCORING.qualifyingBonus.enabled).toBe(true);
    });

    it.each([
      [1, 5], [2, 3], [3, 2], [4, 1], [5, 1],
    ])('Q%i awards %i bonus points', (pos, pts) => {
      expect(DEFAULT_FANTASY_SCORING.qualifyingBonus[pos]).toBe(pts);
    });

    it('P6 has no qualifying bonus', () => {
      expect(DEFAULT_FANTASY_SCORING.qualifyingBonus[6]).toBeUndefined();
    });
  });

  // ─── sprintPosition ───────────────────────────────────────────────────────────

  describe('sprintPosition', () => {
    it('is enabled', () => {
      expect(DEFAULT_FANTASY_SCORING.sprintPosition.enabled).toBe(true);
    });

    it.each([
      [1, 8], [2, 7], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [8, 1],
    ])('sprint P%i awards %i points', (pos, pts) => {
      expect(DEFAULT_FANTASY_SCORING.sprintPosition[pos]).toBe(pts);
    });

    it('sprint P9 has no points', () => {
      expect(DEFAULT_FANTASY_SCORING.sprintPosition[9]).toBeUndefined();
    });
  });

  // ─── bonuses ──────────────────────────────────────────────────────────────────

  describe('bonuses', () => {
    it('fastest lap is enabled and worth +2 points', () => {
      expect(DEFAULT_FANTASY_SCORING.bonuses.fastestLap.enabled).toBe(true);
      expect(DEFAULT_FANTASY_SCORING.bonuses.fastestLap.points).toBe(2);
    });

    it('podium bonus is disabled', () => {
      expect(DEFAULT_FANTASY_SCORING.bonuses.podium.enabled).toBe(false);
    });

    it('beat-teammate bonus is disabled', () => {
      expect(DEFAULT_FANTASY_SCORING.bonuses.beatTeammate.enabled).toBe(false);
    });
  });

  // ─── penalties ────────────────────────────────────────────────────────────────

  describe('penalties', () => {
    it('DNF penalty is enabled and worth -5', () => {
      expect(DEFAULT_FANTASY_SCORING.penalties.dnf.enabled).toBe(true);
      expect(DEFAULT_FANTASY_SCORING.penalties.dnf.points).toBe(-5);
    });

    it('disqualification penalty is enabled and worth -10', () => {
      expect(DEFAULT_FANTASY_SCORING.penalties.disqualified.enabled).toBe(true);
      expect(DEFAULT_FANTASY_SCORING.penalties.disqualified.points).toBe(-10);
    });

    it('DNS penalty is enabled and worth -3', () => {
      expect(DEFAULT_FANTASY_SCORING.penalties.dns.enabled).toBe(true);
      expect(DEFAULT_FANTASY_SCORING.penalties.dns.points).toBe(-3);
    });

    it('all penalty point values are negative', () => {
      const { dnf, disqualified, dns } = DEFAULT_FANTASY_SCORING.penalties;
      expect(dnf.points).toBeLessThan(0);
      expect(disqualified.points).toBeLessThan(0);
      expect(dns.points).toBeLessThan(0);
    });
  });
});

// ─── SCORING_PRESETS ─────────────────────────────────────────────────────────────

describe('SCORING_PRESETS', () => {
  it('has a standard preset that is the same object as DEFAULT_FANTASY_SCORING', () => {
    expect(SCORING_PRESETS.standard).toBe(DEFAULT_FANTASY_SCORING);
  });

  it('has a highVariance preset', () => {
    expect(SCORING_PRESETS.highVariance).toBeDefined();
  });

  it('has a conservative preset', () => {
    expect(SCORING_PRESETS.conservative).toBeDefined();
  });

  it('highVariance has a larger fastest-lap bonus than default', () => {
    expect(SCORING_PRESETS.highVariance.bonuses.fastestLap.points).toBeGreaterThan(
      DEFAULT_FANTASY_SCORING.bonuses.fastestLap.points
    );
  });

  it('highVariance DNF penalty is more negative than default', () => {
    expect(SCORING_PRESETS.highVariance.penalties.dnf.points).toBeLessThan(
      DEFAULT_FANTASY_SCORING.penalties.dnf.points
    );
  });

  it('conservative preset disables all penalties', () => {
    const p = SCORING_PRESETS.conservative.penalties;
    expect(p.dnf.enabled).toBe(false);
    expect(p.disqualified.enabled).toBe(false);
    expect(p.dns.enabled).toBe(false);
  });
});
