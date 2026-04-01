// tests/integration/draft-lifecycle.integration.test.js
// Integration tests for the full draft lifecycle:
// DraftStore + DraftRules + real DataStore (no mocks for business logic)

import { describe, it, expect, beforeEach } from 'vitest';
import { DraftStore } from '../../lib/draft-store.js';
import { createDraftConfig, DRAFT_STATUS } from '../../lib/draft-config.js';
import { createTestDataStore } from './helpers.js';

describe('Draft Lifecycle Integration', () => {
  let ds;
  let store;
  let config;

  beforeEach(() => {
    localStorage.clear();
    ds = createTestDataStore();
    store = new DraftStore();
    config = createDraftConfig(ds, 2026);
  });

  // ─── Config from real DataStore ────────────────────────────────────────────

  describe('createDraftConfig with real DataStore', () => {
    it('calculates rosterSize from actual team count', () => {
      expect(config.rosterSize).toBe(5); // 5 teams in fixtures
    });

    it('defaults to snake draft with 2 players', () => {
      expect(config.draftType).toBe('snake');
      expect(config.playerCount).toBe(2);
    });
  });

  // ─── Full draft flow ──────────────────────────────────────────────────────

  describe('Create → Start → Pick → Complete', () => {
    it('completes a full 5-pick draft with auto-pairing', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      // Pick 1: Alice picks Verstappen → Bob auto-gets Perez (Red Bull pair)
      const pick1 = store.makePick('max_verstappen', ds);
      expect(pick1.success).toBe(true);
      expect(pick1.pick.playerId).toBe('player_1');
      expect(pick1.teammatePicks).toHaveLength(1);
      expect(pick1.teammatePicks[0].driverId).toBe('sergio_perez');
      expect(pick1.teammatePicks[0].autoPicked).toBe(true);

      // Pick 2: Bob picks Leclerc → Alice auto-gets Sainz (Ferrari pair)
      const pick2 = store.makePick('charles_leclerc', ds);
      expect(pick2.success).toBe(true);
      expect(pick2.pick.playerId).toBe('player_2');
      expect(pick2.teammatePicks[0].driverId).toBe('carlos_sainz');

      // Pick 3: Bob picks Norris (snake round 2) → Alice auto-gets Piastri (McLaren pair)
      const pick3 = store.makePick('lando_norris', ds);
      expect(pick3.success).toBe(true);
      expect(pick3.pick.playerId).toBe('player_2');
      expect(pick3.teammatePicks[0].driverId).toBe('oscar_piastri');

      // Pick 4: Alice picks Hamilton (snake round 2) → Bob auto-gets Russell (Mercedes pair)
      const pick4 = store.makePick('lewis_hamilton', ds);
      expect(pick4.success).toBe(true);
      expect(pick4.pick.playerId).toBe('player_1');
      expect(pick4.teammatePicks[0].driverId).toBe('george_russell');

      // Pick 5: Alice picks Alonso (round 3) → Bob auto-gets Stroll (Aston Martin pair)
      const pick5 = store.makePick('fernando_alonso', ds);
      expect(pick5.success).toBe(true);
      expect(pick5.teammatePicks[0].driverId).toBe('lance_stroll');

      // Draft should be complete
      expect(store.draft.status).toBe(DRAFT_STATUS.COMPLETED);
      expect(store.draft.completedAt).toBeTruthy();
    });

    it('assigns correct rosters after full draft', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      // Snake: Alice(0), Bob(1), Bob(1-snake), Alice(0-snake), Alice(0)
      // Alice: VER, SAI(auto), PIA(auto), HAM, ALO  (actively picks VER, HAM, ALO)
      // Bob:   PER(auto), LEC, NOR, RUS(auto), STR(auto)  (actively picks LEC, NOR)
      store.makePick('max_verstappen', ds);
      store.makePick('charles_leclerc', ds);
      store.makePick('lando_norris', ds);
      store.makePick('lewis_hamilton', ds);
      store.makePick('fernando_alonso', ds);

      const alice = store.draft.players[0];
      const bob = store.draft.players[1];

      expect(alice.roster).toContain('max_verstappen');
      expect(alice.roster).toContain('carlos_sainz');
      expect(alice.roster).toContain('oscar_piastri');
      expect(alice.roster).toContain('lewis_hamilton');
      expect(alice.roster).toContain('fernando_alonso');
      expect(alice.roster).toHaveLength(5);

      expect(bob.roster).toContain('sergio_perez');
      expect(bob.roster).toContain('charles_leclerc');
      expect(bob.roster).toContain('lando_norris');
      expect(bob.roster).toContain('george_russell');
      expect(bob.roster).toContain('lance_stroll');
      expect(bob.roster).toHaveLength(5);
    });

    it('follows snake draft order across rounds', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      // Track who picks each time
      const pickOrder = [];

      const firstDrivers = [
        'max_verstappen',   // Round 1, Pick 1 → Alice (index 0)
        'charles_leclerc',  // Round 1, Pick 2 → Bob   (index 1)
        'lando_norris',     // Round 2, Pick 1 → Bob   (index 1, snake reversal!)
        'lewis_hamilton',   // Round 2, Pick 2 → Alice  (index 0, snake reversal!)
        'fernando_alonso',  // Round 3, Pick 1 → Alice  (index 0)
      ];

      for (const driverId of firstDrivers) {
        const currentPlayer = store.getCurrentPlayer();
        pickOrder.push(currentPlayer.playerId);
        store.makePick(driverId, ds);
      }

      // Snake order: Alice, Bob, Bob, Alice, Alice
      expect(pickOrder).toEqual([
        'player_1', 'player_2', 'player_2', 'player_1', 'player_1'
      ]);
    });
  });

  // ─── Validation ────────────────────────────────────────────────────────────

  describe('Pick validation with real data', () => {
    it('prevents picking a driver whose teammate was already drafted', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      // Alice picks Verstappen → Perez auto-assigned to Bob
      store.makePick('max_verstappen', ds);

      // Bob tries to pick Perez (already drafted via auto-pairing)
      const result = store.makePick('sergio_perez', ds);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already drafted');
    });

    it('prevents picking after draft is completed', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      store.makePick('max_verstappen', ds);
      store.makePick('charles_leclerc', ds);
      store.makePick('lando_norris', ds);
      store.makePick('lewis_hamilton', ds);
      store.makePick('fernando_alonso', ds);

      const result = store.makePick('max_verstappen', ds);
      expect(result.success).toBe(false);
    });

    it('prevents picking before draft starts', () => {
      store.createDraft(config, [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }]);
      const result = store.makePick('max_verstappen', ds);
      expect(result.success).toBe(false);
    });
  });

  // ─── Undo operations ──────────────────────────────────────────────────────

  describe('Undo with real data', () => {
    it('undoPickPair removes both main and auto-paired driver', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      store.makePick('max_verstappen', ds);
      expect(store.draft.picks).toHaveLength(2); // VER + PER

      store.undoPickPair();
      expect(store.draft.picks).toHaveLength(0);
      expect(store.draft.players[0].roster).toHaveLength(0);
      expect(store.draft.players[1].roster).toHaveLength(0);
    });

    it('unpauses draft when undoing from completed state', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      store.makePick('max_verstappen', ds);
      store.makePick('charles_leclerc', ds);
      store.makePick('lando_norris', ds);
      store.makePick('lewis_hamilton', ds);
      store.makePick('fernando_alonso', ds);
      expect(store.draft.status).toBe(DRAFT_STATUS.COMPLETED);

      store.undoPickPair();
      expect(store.draft.status).toBe(DRAFT_STATUS.IN_PROGRESS);
      expect(store.draft.completedAt).toBeNull();
    });
  });

  // ─── Remove driver from roster ─────────────────────────────────────────────

  describe('removeDriverFromRoster with real data', () => {
    it('removes actively-picked driver and auto-paired teammate after draft completes', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      store.makePick('max_verstappen', ds);
      store.makePick('charles_leclerc', ds);
      store.makePick('lando_norris', ds);
      store.makePick('lewis_hamilton', ds);
      store.makePick('fernando_alonso', ds);

      // After COMPLETED, any player can remove their own drivers
      const result = store.removeDriverFromRoster('max_verstappen', ds);
      expect(result.success).toBe(true);
      expect(result.removedTeammates).toContain('sergio_perez');

      expect(store.draft.players[0].roster).not.toContain('max_verstappen');
      expect(store.draft.players[1].roster).not.toContain('sergio_perez');
    });

    it('prevents removal of auto-picked driver', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      store.makePick('max_verstappen', ds); // Perez auto-assigned to Bob

      // Try to remove Perez (auto-picked)
      const result = store.removeDriverFromRoster('sergio_perez', ds);
      expect(result.success).toBe(false);
      expect(result.error).toContain('auto-assigned');
    });
  });

  // ─── localStorage persistence ──────────────────────────────────────────────

  describe('Draft persistence across instances', () => {
    it('saves and restores draft state from localStorage', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();
      store.makePick('max_verstappen', ds);

      // Create a new DraftStore (simulating page reload)
      const store2 = new DraftStore();
      expect(store2.draft).toBeTruthy();
      expect(store2.draft.players[0].roster).toContain('max_verstappen');
      expect(store2.draft.picks).toHaveLength(2);
    });

    it('persists completed draft status', () => {
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();

      store.makePick('max_verstappen', ds);
      store.makePick('charles_leclerc', ds);
      store.makePick('lando_norris', ds);
      store.makePick('lewis_hamilton', ds);
      store.makePick('fernando_alonso', ds);

      const store2 = new DraftStore();
      expect(store2.draft.status).toBe(DRAFT_STATUS.COMPLETED);
      expect(store2.draft.players[0].roster).toHaveLength(5);
      expect(store2.draft.players[1].roster).toHaveLength(5);
    });
  });

  // ─── Subscriber notifications ──────────────────────────────────────────────

  describe('Event notifications during lifecycle', () => {
    it('notifies subscribers on each pick', () => {
      const events = [];
      store.subscribe(() => events.push('notified'));

      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();
      store.makePick('max_verstappen', ds);

      // createDraft (1) + startDraft (1) + makePick (1) = 3 notifications
      expect(events.length).toBe(3);
    });

    it('notifies on undo', () => {
      const events = [];
      const players = [{ name: 'Alice', draftOrder: 0 }, { name: 'Bob', draftOrder: 1 }];
      store.createDraft(config, players);
      store.startDraft();
      store.makePick('max_verstappen', ds);

      store.subscribe(() => events.push('notified'));
      store.undoPickPair();

      expect(events.length).toBe(1);
    });
  });
});
