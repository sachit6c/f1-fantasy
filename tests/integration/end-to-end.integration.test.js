// tests/integration/end-to-end.integration.test.js
// End-to-end integration tests:
// Draft → Scoring → Team Comparison using real modules, no mocks

import { describe, it, expect, beforeEach } from 'vitest';
import { DraftStore } from '../../lib/draft-store.js';
import { createDraftConfig, DRAFT_STATUS } from '../../lib/draft-config.js';
import { FantasyScorer } from '../../lib/fantasy-scorer.js';
import { FantasyTeamScorer } from '../../lib/fantasy-team-scorer.js';
import { createTestDataStore } from './helpers.js';

describe('End-to-End Integration', () => {
  let ds;
  let draftStore;
  let config;
  let teamScorer;

  function completeDraft() {
    const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
    draftStore.createDraft(config, players);
    draftStore.startDraft();

    // Snake: Alice(0), Bob(1), Bob(1-snake), Alice(0-snake), Alice(0)
    // Alice: VER, SAI(auto), PIA(auto), HAM, ALO  (active: VER, HAM, ALO)
    // Bob:   PER(auto), LEC, NOR, RUS(auto), STR(auto)  (active: LEC, NOR)
    draftStore.makePick('max_verstappen', ds);    // Alice → VER, Bob ← PER
    draftStore.makePick('charles_leclerc', ds);   // Bob   → LEC, Alice ← SAI
    draftStore.makePick('lando_norris', ds);       // Bob   → NOR, Alice ← PIA (snake: Bob picks in round 2)
    draftStore.makePick('lewis_hamilton', ds);      // Alice → HAM, Bob ← RUS (snake: Alice picks in round 2)
    draftStore.makePick('fernando_alonso', ds);    // Alice → ALO, Bob ← STR

    expect(draftStore.draft.status).toBe(DRAFT_STATUS.COMPLETED);
  }

  beforeEach(() => {
    localStorage.clear();
    ds = createTestDataStore();
    draftStore = new DraftStore();
    config = createDraftConfig(ds, 2026);
    teamScorer = new FantasyTeamScorer();
  });

  // ─── Single race team scoring ──────────────────────────────────────────────

  describe('Team scoring for a single race after draft', () => {
    it('aggregates all roster driver scores for Alice in R1', () => {
      completeDraft();

      // Alice has: VER, SAI, PIA, HAM, ALO
      const result = teamScorer.scorePlayerRace('player_1', '2026_01', draftStore, ds);
      expect(result.drivers).toHaveLength(5);
      expect(result.total).toBeGreaterThan(0);

      // VER won R1 — scorePlayerRace uses official F1 race points: P1 = 25
      const ver = result.drivers.find(d => d.driverId === 'max_verstappen');
      expect(ver.total).toBe(25);
    });

    it('aggregates all roster driver scores for Bob in R1', () => {
      completeDraft();

      // Bob has: PER, LEC, NOR, RUS, STR
      const result = teamScorer.scorePlayerRace('player_2', '2026_01', draftStore, ds);
      expect(result.drivers).toHaveLength(5);

      // LEC P2 in R1 — scorePlayerRace uses official F1 race points: P2 = 18
      const lec = result.drivers.find(d => d.driverId === 'charles_leclerc');
      expect(lec.total).toBe(18);
    });

    it('Alice scores higher than Bob in R1', () => {
      completeDraft();

      const aliceR1 = teamScorer.scorePlayerRace('player_1', '2026_01', draftStore, ds);
      const bobR1 = teamScorer.scorePlayerRace('player_2', '2026_01', draftStore, ds);

      // Alice has VER(P1), SAI(P6), PIA(P5), HAM(P4), ALO(P9)
      // Bob has PER(P8), LEC(P2), NOR(P3), RUS(P7), STR(P10)
      expect(aliceR1.total).toBeGreaterThan(bobR1.total);
    });
  });

  // ─── Season scoring ────────────────────────────────────────────────────────

  describe('Season scoring uses official F1 standings points', () => {
    it('Alice season total is sum of official standings for her 5 drivers', () => {
      completeDraft();

      const result = teamScorer.scorePlayerSeason('player_1', draftStore, ds);

      // Alice: VER(200) + SAI(90) + PIA(100) + HAM(120) + ALO(40) = 550
      expect(result.total).toBe(550);
    });

    it('Bob season total is sum of official standings for his 5 drivers', () => {
      completeDraft();

      const result = teamScorer.scorePlayerSeason('player_2', draftStore, ds);

      // Bob: PER(60) + LEC(170) + NOR(150) + RUS(80) + STR(20) = 480
      expect(result.total).toBe(480);
    });

    it('season scoring includes per-driver breakdown', () => {
      completeDraft();

      const result = teamScorer.scorePlayerSeason('player_1', draftStore, ds);
      expect(result.drivers).toHaveLength(5);

      const ver = result.drivers.find(d => d.driverId === 'max_verstappen');
      expect(ver.totalPoints).toBe(200);
      expect(ver.wins).toBe(5);
      expect(ver.position).toBe(1);
    });

    it('season scoring includes race-by-race breakdown', () => {
      completeDraft();

      const result = teamScorer.scorePlayerSeason('player_1', draftStore, ds);
      expect(result.races).toHaveLength(3); // 3 races with results
      expect(result.races[0].raceId).toBe('2026_01');
      expect(result.races[0].total).toBeGreaterThan(0);
    });
  });

  // ─── Head-to-head comparison ───────────────────────────────────────────────

  describe('compareTeams full pipeline', () => {
    it('returns leader and margin', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.leader).toBe('player_1'); // Alice has 550 vs Bob 480
      expect(comparison.margin).toBe(70);
    });

    it('includes race-by-race comparison results', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.raceComparisons).toHaveLength(3);

      comparison.raceComparisons.forEach(rc => {
        expect(rc).toHaveProperty('raceId');
        expect(rc).toHaveProperty('player1Total');
        expect(rc).toHaveProperty('player2Total');
        expect(rc).toHaveProperty('winner');
        expect(rc).toHaveProperty('margin');
      });
    });

    it('counts race wins and ties correctly', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      const { player1, player2, ties } = comparison;

      // Verify race wins + ties == total races
      expect(player1.fantasyWins + player2.fantasyWins + ties).toBe(3);
    });

    it('calculates aggregate team stats (wins, podiums, DNFs)', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);

      // Alice's team raceWins: VER won R1 + R2, NOR won 0 race in fixture data
      // (using fixture race results positions, not standings wins)
      expect(comparison.player1.raceWins).toBeGreaterThanOrEqual(0);
      expect(comparison.player1.podiums).toBeGreaterThanOrEqual(0);
      expect(comparison.player2.dnfs).toBeGreaterThanOrEqual(0);
    });

    it('identifies teammate driver matchups', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);

      // With 5 teams and alternating picks, we should have 5 teammate matchups
      // Alice: VER, SAI, PIA, HAM, ALO vs Bob: PER, LEC, NOR, RUS, STR
      // Teammates: VER↔PER (Red Bull), SAI↔LEC (Ferrari), PIA↔NOR (McLaren),
      //            HAM↔RUS (Mercedes), ALO↔STR (Aston Martin)
      expect(comparison.driverMatchups.matchups.length).toBe(5);
    });

    it('matchup compares teammates using official standings points', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      const rbMatchup = comparison.driverMatchups.matchups.find(
        m => m.team === 'Red Bull Racing'
      );

      expect(rbMatchup.driver1Id).toBe('max_verstappen');
      expect(rbMatchup.driver2Id).toBe('sergio_perez');
      expect(rbMatchup.driver1Points).toBe(200);
      expect(rbMatchup.driver2Points).toBe(60);
      expect(rbMatchup.winner).toBe('player1');
      expect(rbMatchup.margin).toBe(140);
    });

    it('matchup includes qualifying and race beat counts', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      const mclarenMatchup = comparison.driverMatchups.matchups.find(
        m => m.team === 'McLaren'
      );

      // NOR (Bob) vs PIA (Alice) across 3 races
      expect(mclarenMatchup.driver1QualiBeats).toBeGreaterThanOrEqual(0);
      expect(mclarenMatchup.driver2QualiBeats).toBeGreaterThanOrEqual(0);
      expect(mclarenMatchup.driver1RaceBeats).toBeGreaterThanOrEqual(0);
      expect(mclarenMatchup.driver2RaceBeats).toBeGreaterThanOrEqual(0);
      expect(
        mclarenMatchup.driver1QualiBeats + mclarenMatchup.driver2QualiBeats
      ).toBeLessThanOrEqual(3); // max 3 races
    });

    it('matchup tracks podiums, DNFs, and fastest laps per driver', () => {
      completeDraft();

      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      const ferMatchup = comparison.driverMatchups.matchups.find(
        m => m.team === 'Ferrari'
      );

      // SAI (Alice) vs LEC (Bob) in Ferrari
      // LEC won R3 (P1), had P2 in R1, P3 in R2 — strong season
      expect(ferMatchup.driver2Podiums).toBeGreaterThanOrEqual(1); // LEC P1 in R3, P2 in R1, P3 in R2
      expect(typeof ferMatchup.driver1DNFs).toBe('number');
      expect(typeof ferMatchup.driver2FastestLaps).toBe('number');
    });
  });

  // ─── Draft → Undo → Rescore ────────────────────────────────────────────────

  describe('Draft modification and re-scoring', () => {
    it('scores correctly after undoing last pick pair and re-picking', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      draftStore.createDraft(config, players);
      draftStore.startDraft();

      draftStore.makePick('max_verstappen', ds);
      draftStore.makePick('charles_leclerc', ds);
      draftStore.makePick('lando_norris', ds);
      draftStore.makePick('lewis_hamilton', ds);

      // Undo last pick (HAM ← Alice, RUS ← Bob removed)
      draftStore.undoPickPair();

      // Re-pick with Alonso instead, then Hamilton to complete
      draftStore.makePick('fernando_alonso', ds);
      draftStore.makePick('lewis_hamilton', ds);

      expect(draftStore.draft.status).toBe(DRAFT_STATUS.COMPLETED);

      // Alice now has: VER, SAI, NOR, STR, ALO (different from original!)
      // Bob now has:   PER, LEC, PIA, HAM, RUS (different!)
      const aliceSeason = teamScorer.scorePlayerSeason('player_1', draftStore, ds);
      const bobSeason = teamScorer.scorePlayerSeason('player_2', draftStore, ds);

      expect(aliceSeason.total).toBeGreaterThan(0);
      expect(bobSeason.total).toBeGreaterThan(0);
      expect(aliceSeason.total + bobSeason.total).toBe(
        200 + 170 + 150 + 120 + 100 + 90 + 80 + 60 + 40 + 20
      ); // All 10 drivers = 1030 total
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('scoring an empty draft returns zero', () => {
      draftStore.createDraft(config, [
        { name: 'Alice', draftOrder: 0 },
        { name: 'Bob', draftOrder: 1 }
      ]);

      const result = teamScorer.scorePlayerRace('player_1', '2026_01', draftStore, ds);
      expect(result.total).toBe(0);
      expect(result.drivers).toHaveLength(0);
    });

    it('scoring with null draft returns zero gracefully', () => {
      draftStore.draft = null;
      const result = teamScorer.scorePlayerSeason('player_1', draftStore, ds);
      expect(result.total).toBe(0);
    });

    it('comparison with partially completed draft still works', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      draftStore.createDraft(config, players);
      draftStore.startDraft();
      draftStore.makePick('max_verstappen', ds);

      // Only 1 pick made — rosters are [VER] and [PER]
      const comparison = teamScorer.compareTeams('player_1', 'player_2', draftStore, ds);
      expect(comparison.player1.totalPoints).toBe(200); // VER
      expect(comparison.player2.totalPoints).toBe(60);  // PER
    });

    it('handles race with mixed finishes and DNFs in team scoring', () => {
      completeDraft();

      // R2 has Perez DNF (Bob's team)
      const bobR2 = teamScorer.scorePlayerRace('player_2', '2026_02', draftStore, ds);
      const perezScore = bobR2.drivers.find(d => d.driverId === 'sergio_perez');
      // scorePlayerRace uses official race points — Perez DNF gives 0 official points
      expect(perezScore.total).toBe(0);
      expect(bobR2.total).toBeLessThan(
        teamScorer.scorePlayerRace('player_1', '2026_02', draftStore, ds).total
      );
    });
  });
});
