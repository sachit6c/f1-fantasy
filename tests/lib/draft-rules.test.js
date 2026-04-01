import { describe, it, expect, beforeEach } from 'vitest';
import { DraftRules } from '../../lib/draft-rules.js';

const makeConfig = (overrides = {}) => ({
  draftType: 'snake',
  playerCount: 2,
  rosterSize: 10,
  ...overrides
});

describe('DraftRules', () => {
  let rules;

  beforeEach(() => {
    rules = new DraftRules(makeConfig());
  });

  // ─── getTotalPicks ────────────────────────────────────────────────────────────

  describe('getTotalPicks', () => {
    it('returns rosterSize', () => {
      expect(rules.getTotalPicks()).toBe(10);
    });

    it('reflects a custom rosterSize', () => {
      const r = new DraftRules(makeConfig({ rosterSize: 5 }));
      expect(r.getTotalPicks()).toBe(5);
    });
  });

  // ─── getPlayerForPick (snake, 2 players) ─────────────────────────────────────
  // Round 0 (picks 0,1): player 0 → 1
  // Round 1 (picks 2,3): reversed → 1 → 0
  // Round 2 (picks 4,5): player 0 → 1
  // Round 3 (picks 6,7): reversed → 1 → 0
  // Round 4 (picks 8,9): player 0 → 1

  describe('getPlayerForPick (snake, 2 players)', () => {
    it.each([
      [0, 0], [1, 1],
      [2, 1], [3, 0],
      [4, 0], [5, 1],
      [6, 1], [7, 0],
      [8, 0], [9, 1],
    ])('pick %i → player %i', (pickIndex, expectedPlayer) => {
      expect(rules.getPlayerForPick(pickIndex)).toBe(expectedPlayer);
    });
  });

  describe('getPlayerForPick (fixed, 2 players)', () => {
    it('alternates strictly by modulo', () => {
      const r = new DraftRules(makeConfig({ draftType: 'fixed' }));
      expect(r.getPlayerForPick(0)).toBe(0);
      expect(r.getPlayerForPick(1)).toBe(1);
      expect(r.getPlayerForPick(2)).toBe(0);
      expect(r.getPlayerForPick(3)).toBe(1);
    });
  });

  // ─── getRoundForPick ──────────────────────────────────────────────────────────

  describe('getRoundForPick', () => {
    it.each([
      [0, 1], [1, 1],
      [2, 2], [3, 2],
      [8, 5], [9, 5],
    ])('pick %i → round %i', (pickIndex, expectedRound) => {
      expect(rules.getRoundForPick(pickIndex)).toBe(expectedRound);
    });
  });

  // ─── validatePick ─────────────────────────────────────────────────────────────

  describe('validatePick', () => {
    it('returns valid for an undrafted driver', () => {
      const result = rules.validatePick('driver_a', ['driver_b']);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    it('returns invalid when driver is already drafted', () => {
      const result = rules.validatePick('driver_a', ['driver_a', 'driver_b']);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Driver already drafted');
    });

    it('returns valid when draftedDrivers is empty', () => {
      const result = rules.validatePick('driver_a', []);
      expect(result.valid).toBe(true);
    });
  });

  // ─── isDraftComplete ──────────────────────────────────────────────────────────

  describe('isDraftComplete', () => {
    it('returns false when picks < rosterSize', () => {
      expect(rules.isDraftComplete(9)).toBe(false);
    });

    it('returns true when picks exactly equals rosterSize', () => {
      expect(rules.isDraftComplete(10)).toBe(true);
    });

    it('returns true when picks exceed rosterSize', () => {
      expect(rules.isDraftComplete(11)).toBe(true);
    });

    it('returns false at 0 picks', () => {
      expect(rules.isDraftComplete(0)).toBe(false);
    });
  });

  // ─── isRosterFull ─────────────────────────────────────────────────────────────

  describe('isRosterFull', () => {
    it('returns false for an empty roster', () => {
      expect(rules.isRosterFull([])).toBe(false);
    });

    it('returns false when roster has fewer than rosterSize drivers', () => {
      expect(rules.isRosterFull(['d1', 'd2'])).toBe(false);
    });

    it('returns true when roster length equals rosterSize', () => {
      expect(rules.isRosterFull(Array(10).fill('d'))).toBe(true);
    });

    it('returns true when roster exceeds rosterSize', () => {
      expect(rules.isRosterFull(Array(11).fill('d'))).toBe(true);
    });
  });
});
