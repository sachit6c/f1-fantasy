// tests/integration/scoring-pipeline.integration.test.js
// Integration tests for the scoring pipeline:
// FantasyTeamScorer.scorePlayerRace using actual F1 points from race results

import { describe, it, expect, beforeEach } from 'vitest';
import { FantasyTeamScorer } from '../../lib/fantasy-team-scorer.js';
import { createTestDataStore } from './helpers.js';

// Minimal mock draftStore factory
function makeDraftStore(roster1, roster2 = []) {
  return {
    draft: {
      season: 2026,
      players: [
        { playerId: 'p1', name: 'Player 1', roster: roster1 },
        { playerId: 'p2', name: 'Player 2', roster: roster2 },
      ]
    }
  };
}

describe('Scoring Pipeline Integration', () => {
  let ds;
  let scorer;

  beforeEach(() => {
    ds = createTestDataStore();
    scorer = new FantasyTeamScorer();
  });

  // ─── scorePlayerRace — actual F1 points ───────────────────────────────────

  describe('scorePlayerRace uses actual race points', () => {
    it('sums actual points for a roster in Australian GP', () => {
      // Verstappen P1=25, Norris P3=15 → 40
      const draftStore = makeDraftStore(['max_verstappen', 'lando_norris']);
      const result = scorer.scorePlayerRace('p1', '2026_01', draftStore, ds);
      expect(result.total).toBe(40);
      expect(result.drivers).toHaveLength(2);
      expect(result.drivers.find(d => d.driverId === 'max_verstappen').total).toBe(25);
      expect(result.drivers.find(d => d.driverId === 'lando_norris').total).toBe(15);
    });

    it('scores DNF driver at 0 (actual points in CSV)', () => {
      // Perez DNF in Race 2 → points='0' in CSV
      const draftStore = makeDraftStore(['sergio_perez']);
      const result = scorer.scorePlayerRace('p1', '2026_02', draftStore, ds);
      expect(result.total).toBe(0);
    });

    it('scores DSQ driver at 0 (actual points in CSV)', () => {
      // Norris DSQ in Race 3 → points='0' in CSV
      const draftStore = makeDraftStore(['lando_norris']);
      const result = scorer.scorePlayerRace('p1', '2026_03', draftStore, ds);
      expect(result.total).toBe(0);
    });

    it('returns 0 for a driver not in the race', () => {
      const draftStore = makeDraftStore(['nobody']);
      const result = scorer.scorePlayerRace('p1', '2026_01', draftStore, ds);
      expect(result.total).toBe(0);
    });

    it('returns 0 for unknown player', () => {
      const draftStore = makeDraftStore(['max_verstappen']);
      const result = scorer.scorePlayerRace('unknown', '2026_01', draftStore, ds);
      expect(result.total).toBe(0);
    });

    it('returns 0 when draft is null', () => {
      const draftStore = { draft: null };
      const result = scorer.scorePlayerRace('p1', '2026_01', draftStore, ds);
      expect(result.total).toBe(0);
    });
  });

  // ─── Cross-race consistency ────────────────────────────────────────────────

  describe('Multi-race scoring consistency', () => {
    it('Verstappen accumulates 68 actual points across 3 races (P1+P1+P2)', () => {
      // R1: 25, R2: 25, R3: 18 = 68
      const draftStore = makeDraftStore(['max_verstappen']);
      const total = ['2026_01', '2026_02', '2026_03']
        .reduce((sum, raceId) => sum + scorer.scorePlayerRace('p1', raceId, draftStore, ds).total, 0);
      expect(total).toBe(68);
    });

    it('Perez R2 DNF gives 0 for that race', () => {
      const draftStore = makeDraftStore(['sergio_perez']);
      const r1 = scorer.scorePlayerRace('p1', '2026_01', draftStore, ds).total;
      const r2 = scorer.scorePlayerRace('p1', '2026_02', draftStore, ds).total;
      expect(r1).toBe(4);  // P8 in R1
      expect(r2).toBe(0);  // DNF in R2
    });
  });

  // ─── Head-to-head comparison ───────────────────────────────────────────────

  describe('compareTeams', () => {
    it('correctly identifies race winner in Australian GP', () => {
      // p1: Verstappen(25) + Norris(15) = 40
      // p2: Leclerc(18) + Hamilton(12) = 30
      const draftStore = makeDraftStore(
        ['max_verstappen', 'lando_norris'],
        ['charles_leclerc', 'lewis_hamilton']
      );
      const cmp = scorer.compareTeams('p1', 'p2', draftStore, ds);
      const r1 = cmp.raceComparisons[0];
      expect(r1.player1Total).toBe(40);
      expect(r1.player2Total).toBe(30);
      expect(r1.winner).toBe('p1');
      expect(r1.margin).toBe(10);
    });
  });
});
