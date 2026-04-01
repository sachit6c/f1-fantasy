import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftStore } from '../../lib/draft-store.js';
import { DRAFT_STATUS } from '../../lib/draft-config.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeConfig = (overrides = {}) => ({
  draftType: 'snake',
  playerCount: 2,
  rosterSize: 5,
  season: 2026,
  allowDuplicates: false,
  ...overrides
});

const makePlayers = () => [
  { name: 'Alice', draftOrder: 0 },
  { name: 'Bob',   draftOrder: 1 }
];

/**
 * Creates a mock dataStore with 5 teams (10 drivers, each paired with a teammate).
 * Teams: A↔B, C↔D, E↔F, G↔H, I↔J
 */
function makeDataStore() {
  const teams = {
    driver_a: [{ driverId: 'driver_b', name: 'Driver B' }],
    driver_b: [{ driverId: 'driver_a', name: 'Driver A' }],
    driver_c: [{ driverId: 'driver_d', name: 'Driver D' }],
    driver_d: [{ driverId: 'driver_c', name: 'Driver C' }],
    driver_e: [{ driverId: 'driver_f', name: 'Driver F' }],
    driver_f: [{ driverId: 'driver_e', name: 'Driver E' }],
    driver_g: [{ driverId: 'driver_h', name: 'Driver H' }],
    driver_h: [{ driverId: 'driver_g', name: 'Driver G' }],
    driver_i: [{ driverId: 'driver_j', name: 'Driver J' }],
    driver_j: [{ driverId: 'driver_i', name: 'Driver I' }]
  };
  return {
    getTeammates: vi.fn((driverId) => teams[driverId] || []),
    getTeamCount: vi.fn(() => 5)
  };
}

/** Advances the store through all 5 picks to reach COMPLETED. */
function completeDraft(store, dataStore) {
  for (const id of ['driver_a', 'driver_c', 'driver_e', 'driver_g', 'driver_i']) {
    store.makePick(id, dataStore);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DraftStore', () => {
  let store;
  let dataStore;

  beforeEach(() => {
    localStorage.clear();
    store = new DraftStore();
    dataStore = makeDataStore();
  });

  // ─── createDraft ───────────────────────────────────────────────────────────

  describe('createDraft', () => {
    it('creates a draft with SETUP status', () => {
      const draft = store.createDraft(makeConfig(), makePlayers());
      expect(draft.status).toBe(DRAFT_STATUS.SETUP);
    });

    it('initialises two players with correct names', () => {
      const draft = store.createDraft(makeConfig(), makePlayers());
      expect(draft.players[0].name).toBe('Alice');
      expect(draft.players[1].name).toBe('Bob');
    });

    it('initialises empty rosters and an empty picks array', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.draft.players.forEach(p => expect(p.roster).toEqual([]));
      expect(store.draft.picks).toHaveLength(0);
    });

    it('starts at currentPickIndex = 0', () => {
      store.createDraft(makeConfig(), makePlayers());
      expect(store.draft.currentPickIndex).toBe(0);
    });

    it('sets DATA_VERSION = 2', () => {
      store.createDraft(makeConfig(), makePlayers());
      expect(store.draft.dataVersion).toBe(2);
    });

    it('falls back to "Player N" when no name is provided', () => {
      store.createDraft(makeConfig(), [{ draftOrder: 0 }, { draftOrder: 1 }]);
      expect(store.draft.players[0].name).toBe('Player 1');
      expect(store.draft.players[1].name).toBe('Player 2');
    });

    it('uses array index for draftOrder when player has no draftOrder field', () => {
      // Covers the `p.draftOrder !== undefined ? p.draftOrder : idx` fallback branch
      store.createDraft(makeConfig(), [{ name: 'Alice' }, { name: 'Bob' }]);
      expect(store.draft.players[0].draftOrder).toBe(0);
      expect(store.draft.players[1].draftOrder).toBe(1);
    });

    it('persists the draft to localStorage immediately', () => {
      store.createDraft(makeConfig(), makePlayers());
      expect(localStorage.getItem('f1_fantasy_draft_2026')).not.toBeNull();
    });
  });

  // ─── startDraft ────────────────────────────────────────────────────────────

  describe('startDraft', () => {
    it('transitions status to IN_PROGRESS', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      expect(store.draft.status).toBe(DRAFT_STATUS.IN_PROGRESS);
    });

    it('throws when no draft has been created', () => {
      expect(() => store.startDraft()).toThrow('No draft created');
    });

    it('throws when the draft is already in progress', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      expect(() => store.startDraft()).toThrow('Draft already started or completed');
    });
  });

  // ─── makePick ──────────────────────────────────────────────────────────────

  describe('makePick', () => {
    beforeEach(() => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
    });

    it('returns error when draft is not active', () => {
      store.draft.status = DRAFT_STATUS.SETUP;
      const result = store.makePick('driver_a', dataStore);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Draft not active');
    });

    it('returns success and auto-assigns exactly one teammate', () => {
      const result = store.makePick('driver_a', dataStore);
      expect(result.success).toBe(true);
      expect(result.pick.driverId).toBe('driver_a');
      expect(result.teammatePicks).toHaveLength(1);
      expect(result.teammatePicks[0].driverId).toBe('driver_b');
      expect(result.teammatePicks[0].autoPicked).toBe(true);
    });

    it('adds the main driver to the current player roster', () => {
      store.makePick('driver_a', dataStore);
      expect(store.draft.players[0].roster).toContain('driver_a');
    });

    it('adds the auto-paired teammate to the other player roster', () => {
      store.makePick('driver_a', dataStore);
      expect(store.draft.players[1].roster).toContain('driver_b');
    });

    it('creates two picks per selection (main + auto-paired)', () => {
      store.makePick('driver_a', dataStore);
      expect(store.draft.picks).toHaveLength(2);
    });

    it('advances currentPickIndex by 1 per selection', () => {
      store.makePick('driver_a', dataStore);
      expect(store.draft.currentPickIndex).toBe(1);
    });

    it('returns error when driver has already been drafted', () => {
      store.makePick('driver_a', dataStore);
      const result = store.makePick('driver_a', dataStore);
      expect(result.success).toBe(false);
    });

    it('returns error when a teammate has already been drafted', () => {
      store.makePick('driver_a', dataStore);
      const result = store.makePick('driver_b', dataStore);
      expect(result.success).toBe(false);
    });

    it('returns error when a driver is picked whose teammate was manually pre-drafted', () => {
      // Manually inject driver_b into picks without auto-pairing, so driver_b is drafted
      // but driver_a is not. Then picking driver_a triggers the teammate-check error.
      store.draft.picks.push({ playerId: 'player_0', driverId: 'driver_b', autoPicked: false });
      store.draft.players[0].roster.push('driver_b');
      const result = store.makePick('driver_a', dataStore);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already drafted/i);
    });

    it('returns error when driver has no teammates', () => {
      const noTeammatesDS = {
        getTeammates: vi.fn(() => []),
        getTeamCount: vi.fn(() => 5)
      };
      const result = store.makePick('driver_a', noTeammatesDS);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Driver has no teammates');
    });

    it('marks draft COMPLETED after all picks are made', () => {
      completeDraft(store, dataStore);
      expect(store.draft.status).toBe(DRAFT_STATUS.COMPLETED);
      expect(store.draft.completedAt).not.toBeNull();
    });
  });

  // ─── undoLastPick ─────────────────────────────────────────────────────────

  describe('undoLastPick', () => {
    beforeEach(() => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
    });

    it('returns false when there are no picks to undo', () => {
      expect(store.undoLastPick()).toBe(false);
    });

    it('returns false when no draft exists', () => {
      store.draft = null;
      expect(store.undoLastPick()).toBe(false);
    });

    it('removes the last pick entry from the picks array', () => {
      store.makePick('driver_a', dataStore); // adds 2 picks (main + auto)
      const beforeLen = store.draft.picks.length;
      store.undoLastPick();
      expect(store.draft.picks).toHaveLength(beforeLen - 1);
    });

    it('removes the undone driver from the owning player roster', () => {
      store.makePick('driver_a', dataStore);
      // The last pick is the auto-paired driver_b (assigned to Bob)
      store.undoLastPick();
      const bob = store.draft.players.find(p => p.name === 'Bob');
      expect(bob.roster).not.toContain('driver_b');
    });

    it('decrements currentPickIndex when the last pick was an auto-pick (not a manual pick)', () => {
      store.makePick('driver_a', dataStore); // pickIndex → 1
      const beforeIdx = store.draft.currentPickIndex;
      store.undoLastPick(); // removes auto-pick (last entry, which was not the "manual" trigger)
      expect(store.draft.currentPickIndex).toBe(beforeIdx - 1);
    });

    it('reverts COMPLETED status back to IN_PROGRESS', () => {
      completeDraft(store, dataStore);
      expect(store.draft.status).toBe(DRAFT_STATUS.COMPLETED);
      store.undoLastPick();
      expect(store.draft.status).toBe(DRAFT_STATUS.IN_PROGRESS);
      expect(store.draft.completedAt).toBeNull();
    });

    it('returns true on success', () => {
      store.makePick('driver_a', dataStore);
      expect(store.undoLastPick()).toBe(true);
    });
  });

  // ─── undoPickPair ──────────────────────────────────────────────────────────

  describe('undoPickPair', () => {
    beforeEach(() => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
    });

    it('removes both picks (main + auto-paired) from the picks array', () => {
      store.makePick('driver_a', dataStore);
      expect(store.draft.picks).toHaveLength(2);
      store.undoPickPair();
      expect(store.draft.picks).toHaveLength(0);
    });

    it('decrements currentPickIndex by 1', () => {
      store.makePick('driver_a', dataStore);
      store.undoPickPair();
      expect(store.draft.currentPickIndex).toBe(0);
    });

    it('removes the drivers from their respective rosters', () => {
      store.makePick('driver_a', dataStore);
      store.undoPickPair();
      expect(store.draft.players[0].roster).not.toContain('driver_a');
      expect(store.draft.players[1].roster).not.toContain('driver_b');
    });

    it('returns false when fewer than 2 picks exist', () => {
      expect(store.undoPickPair()).toBe(false);
    });

    it('reverts COMPLETED status back to IN_PROGRESS', () => {
      completeDraft(store, dataStore);
      expect(store.draft.status).toBe(DRAFT_STATUS.COMPLETED);
      store.undoPickPair();
      expect(store.draft.status).toBe(DRAFT_STATUS.IN_PROGRESS);
    });
  });

  // ─── getCurrentPlayer ──────────────────────────────────────────────────────

  describe('getCurrentPlayer', () => {
    it('returns null when no draft exists', () => {
      expect(store.getCurrentPlayer()).toBeNull();
    });

    it('returns the first player (Alice) at pick index 0', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      expect(store.getCurrentPlayer().name).toBe('Alice');
    });

    it('returns the second player (Bob) at pick index 1', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      store.makePick('driver_a', dataStore);
      expect(store.getCurrentPlayer().name).toBe('Bob');
    });
  });

  // ─── getDraftedDrivers / isDriverDrafted ───────────────────────────────────

  describe('getDraftedDrivers and isDriverDrafted', () => {
    it('returns an empty array when no draft exists', () => {
      expect(store.getDraftedDrivers()).toEqual([]);
    });

    it('includes both the manually picked and auto-picked driver', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      store.makePick('driver_a', dataStore);
      const drafted = store.getDraftedDrivers();
      expect(drafted).toContain('driver_a');
      expect(drafted).toContain('driver_b');
    });

    it('isDriverDrafted returns true for a drafted driver', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      store.makePick('driver_a', dataStore);
      expect(store.isDriverDrafted('driver_a')).toBe(true);
      expect(store.isDriverDrafted('driver_b')).toBe(true);
    });

    it('isDriverDrafted returns false for an undrafted driver', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      expect(store.isDriverDrafted('driver_a')).toBe(false);
    });
  });

  // ─── getPlayerWhoPickedDriver ──────────────────────────────────────────────

  describe('getPlayerWhoPickedDriver', () => {
    it('returns null when no draft exists', () => {
      expect(store.getPlayerWhoPickedDriver('driver_a')).toBeNull();
    });

    it('returns the player who actively picked the driver', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      store.makePick('driver_a', dataStore);
      expect(store.getPlayerWhoPickedDriver('driver_a').name).toBe('Alice');
    });

    it('returns the other player for an auto-picked teammate', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      store.makePick('driver_a', dataStore);
      expect(store.getPlayerWhoPickedDriver('driver_b').name).toBe('Bob');
    });

    it('returns null for a driver who has not been drafted', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      expect(store.getPlayerWhoPickedDriver('driver_z')).toBeNull();
    });
  });

  // ─── getProgress ──────────────────────────────────────────────────────────

  describe('getProgress', () => {
    it('returns all-zero progress when no draft exists', () => {
      const progress = store.getProgress();
      expect(progress.totalPicks).toBe(0);
      expect(progress.picksMade).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });

    it('returns correct values after one pick', () => {
      store.createDraft(makeConfig(), makePlayers()); // rosterSize = 5
      store.startDraft();
      store.makePick('driver_a', dataStore);
      const progress = store.getProgress();
      expect(progress.totalPicks).toBe(5);
      expect(progress.picksMade).toBe(1);
      expect(progress.percentComplete).toBe(20);
    });

    it('returns 100% when draft is complete', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      completeDraft(store, dataStore);
      expect(store.getProgress().percentComplete).toBe(100);
    });
  });

  // ─── localStorage persistence ─────────────────────────────────────────────

  describe('localStorage persistence', () => {
    it('round-trips draft through saveDraft → loadDraft', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
      store.makePick('driver_a', dataStore);

      // Simulate a page reload by constructing a fresh store instance
      const store2 = new DraftStore();
      store2.currentSeason = 2026;
      store2.loadDraft();

      expect(store2.draft).not.toBeNull();
      expect(store2.draft.picks).toHaveLength(2);
    });

    it('clearDraft removes the draft and nulls in-memory state', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.clearDraft();
      expect(store.draft).toBeNull();
      expect(localStorage.getItem('f1_fantasy_draft_2026')).toBeNull();
    });

    it('loadDraft returns false and leaves draft null for outdated dataVersion', () => {
      const oldDraft = { draftId: 'old', dataVersion: 1, season: 2026, status: 'setup' };
      localStorage.setItem('f1_fantasy_draft_2026', JSON.stringify(oldDraft));
      const store2 = new DraftStore();
      store2.currentSeason = 2026;
      const loaded = store2.loadDraft();
      expect(loaded).toBe(false);
      expect(store2.draft).toBeNull();
    });

    it('loadDraft returns false for a draft stored without a dataVersion field', () => {
      // Hits the `draft.dataVersion || 0` fallback (line 392)
      const noverDraft = { draftId: 'nover', season: 2026, status: 'setup' };
      localStorage.setItem('f1_fantasy_draft_2026', JSON.stringify(noverDraft));
      const store2 = new DraftStore();
      store2.currentSeason = 2026;
      const loaded = store2.loadDraft();
      expect(loaded).toBe(false);
    });

    it('loadDraft returns false without throwing when currentSeason is null', () => {
      // Hits the `if (!this.currentSeason) return false` branch (line 383)
      const store2 = new DraftStore();
      store2.currentSeason = null;
      expect(store2.loadDraft()).toBe(false);
    });

    it('saveDraft falls back to currentSeason when draft has no season field', () => {
      // Hits the `draft.season || this.currentSeason` fallback
      store.createDraft(makeConfig(), makePlayers());
      delete store.draft.season;
      store.currentSeason = 2026;
      expect(() => store.saveDraft()).not.toThrow();
      expect(localStorage.getItem('f1_fantasy_draft_2026')).not.toBeNull();
    });

    it('saveDraft is a no-op when no draft has been created', () => {
      // Covers the `if (!this.draft) return` guard branch
      const freshStore = new DraftStore();
      freshStore.draft = null;
      expect(() => freshStore.saveDraft()).not.toThrow();
    });

    it('savePlayerNames and loadPlayerNames round-trip', () => {
      store.savePlayerNames('Alice', 'Bob');
      const names = store.loadPlayerNames();
      expect(names.player1).toBe('Alice');
      expect(names.player2).toBe('Bob');
    });

    it('loadPlayerNames returns null when nothing has been saved', () => {
      expect(store.loadPlayerNames()).toBeNull();
    });
  });

  // ─── season management ────────────────────────────────────────────────────

  describe('season management', () => {
    it('defaults to season 2026 when localStorage is empty', () => {
      expect(store.currentSeason).toBe(2026);
    });

    it('loadCurrentSeason reads a previously saved season from localStorage', () => {
      // Hits the `saved ? parseInt(saved) : 2026` truthy branch (line 501)
      localStorage.setItem('f1_fantasy_current_season', '2025');
      store.loadCurrentSeason();
      expect(store.currentSeason).toBe(2025);
    });

    it('setCurrentSeason persists the season to localStorage', () => {
      store.setCurrentSeason(2025);
      expect(store.currentSeason).toBe(2025);
      expect(localStorage.getItem('f1_fantasy_current_season')).toBe('2025');
    });

    it('setCurrentSeason is a no-op when the season is unchanged', () => {
      store.currentSeason = 2026;
      const spy = vi.spyOn(store, 'loadDraft');
      store.setCurrentSeason(2026);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── subscribe / notifyListeners ──────────────────────────────────────────

  describe('subscribe and notifyListeners', () => {
    it('calls the subscriber when draft state changes', () => {
      const callback = vi.fn();
      store.subscribe(callback);
      store.createDraft(makeConfig(), makePlayers());
      expect(callback).toHaveBeenCalled();
    });

    it('passes the current draft object to the callback', () => {
      const callback = vi.fn();
      store.subscribe(callback);
      store.createDraft(makeConfig(), makePlayers());
      expect(callback).toHaveBeenCalledWith(store.draft);
    });

    it('unsubscribe prevents future callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribe(callback);
      unsubscribe();
      store.createDraft(makeConfig(), makePlayers());
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ─── clearAll ─────────────────────────────────────────────────────────────

  describe('clearAll', () => {
    it('nullifies draft, rules, and currentSeason', () => {
      store.createDraft(makeConfig(), makePlayers());
      store.clearAll();
      expect(store.draft).toBeNull();
      expect(store.rules).toBeNull();
      expect(store.currentSeason).toBeNull();
    });

    it('removes player names and current season from localStorage', () => {
      store.savePlayerNames('Alice', 'Bob');
      store.clearAll();
      expect(localStorage.getItem('f1_fantasy_player_names')).toBeNull();
      expect(localStorage.getItem('f1_fantasy_current_season')).toBeNull();
    });
  });

  // ─── removeDriverFromRoster ───────────────────────────────────────────────

  describe('removeDriverFromRoster', () => {
    beforeEach(() => {
      store.createDraft(makeConfig(), makePlayers());
      store.startDraft();
    });

    it('returns error when draft is not active (SETUP status)', () => {
      const freshStore = new DraftStore();
      freshStore.createDraft(makeConfig(), makePlayers());
      // draft is in SETUP status — not IN_PROGRESS or COMPLETED
      const result = freshStore.removeDriverFromRoster('driver_a', dataStore);
      expect(result).toMatchObject({ success: false });
    });

    it('returns error when driver is not in any roster', () => {
      store.makePick('driver_a', dataStore); // picks driver_a + auto-picks driver_b
      const result = store.removeDriverFromRoster('driver_z', dataStore);
      expect(result).toMatchObject({ success: false, error: expect.stringContaining('not found') });
    });

    it('returns error when it is not the owning player\'s turn', () => {
      // pick_index=0 → Alice's turn; Alice picks driver_a, Bob gets driver_b auto
      store.makePick('driver_a', dataStore);
      // Now it is Bob's turn (pickIndex=1). Try to remove driver_a (Alice's driver)
      const result = store.removeDriverFromRoster('driver_a', dataStore);
      expect(result).toMatchObject({ success: false, error: expect.stringMatching(/turn/i) });
    });

    it('returns error when trying to remove an auto-picked driver', () => {
      store.makePick('driver_a', dataStore); // Alice picks driver_a; Bob gets driver_b auto
      // pickIndex=1 → Bob's turn. Bob tries to remove his auto-picked driver_b.
      const result = store.removeDriverFromRoster('driver_b', dataStore);
      expect(result).toMatchObject({ success: false, error: expect.stringMatching(/auto/i) });
    });

    it('returns error when teammates list is empty for the picked driver', () => {
      // Complete the draft (COMPLETED state bypasses turn check)
      completeDraft(store, dataStore);
      // driver_a is Alice's active pick; override dataStore to return no teammates
      const noTeammateDS = { getTeammates: vi.fn(() => []), getTeamCount: vi.fn(() => 5) };
      const result = store.removeDriverFromRoster('driver_a', noTeammateDS);
      expect(result).toMatchObject({ success: false, error: expect.stringMatching(/teammate/i) });
    });

    it('returns error when pick record is not found in the picks array', () => {
      // Complete the draft then delete driver_a's pick entry manually
      completeDraft(store, dataStore);
      store.draft.picks = store.draft.picks.filter(p => p.driverId !== 'driver_a');
      const result = store.removeDriverFromRoster('driver_a', dataStore);
      expect(result).toMatchObject({ success: false, error: expect.stringMatching(/pick record/i) });
    });

    it('successfully removes the actively-picked driver and their auto-paired teammate', () => {
      store.makePick('driver_a', dataStore); // Alice picks driver_a; Bob gets driver_b auto (pickIndex→1)
      store.makePick('driver_c', dataStore); // Bob picks driver_c; Alice gets driver_d auto (pickIndex→2)
      // Snake: pick 2 → player 1 = Bob's turn. Bob removes his active pick (driver_c).
      const result = store.removeDriverFromRoster('driver_c', dataStore);
      expect(result).toMatchObject({ success: true, removedDriver: 'driver_c' });
      // driver_c (Bob's) and driver_d (Alice's auto-pair) should be gone
      const alice = store.draft.players.find(p => p.name === 'Alice');
      const bob   = store.draft.players.find(p => p.name === 'Bob');
      expect(bob.roster).not.toContain('driver_c');
      expect(alice.roster).not.toContain('driver_d');
    });

    it('decrements currentPickIndex after successful removal', () => {
      store.makePick('driver_a', dataStore); // pickIndex → 1
      store.makePick('driver_c', dataStore); // pickIndex → 2 (Bob's turn in snake)
      store.removeDriverFromRoster('driver_c', dataStore); // Bob removes his active pick
      expect(store.draft.currentPickIndex).toBe(1);
    });

    it('reverts COMPLETED status back to IN_PROGRESS on removal', () => {
      // Complete the draft first
      completeDraft(store, dataStore);
      expect(store.draft.status).toBe(DRAFT_STATUS.COMPLETED);
      // Remove a driver from Alice's completed roster
      const alice = store.draft.players.find(p => p.name === 'Alice');
      const driverToRemove = alice.roster[0]; // first actively-picked driver
      store.removeDriverFromRoster(driverToRemove, dataStore);
      expect(store.draft.status).toBe(DRAFT_STATUS.IN_PROGRESS);
    });
  });

  // ─── localStorage error catch branches ───────────────────────────────────

  describe('localStorage error-handling catch branches', () => {
    function breakLocalStorage() {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
    }

    afterEach(() => { vi.restoreAllMocks(); });

    it('saveDraft does not throw when localStorage.setItem fails', () => {
      store.createDraft(makeConfig(), makePlayers());
      breakLocalStorage();
      expect(() => store.saveDraft()).not.toThrow();
    });

    it('loadDraft returns false and does not throw when localStorage.getItem fails', () => {
      breakLocalStorage();
      expect(() => store.loadDraft()).not.toThrow();
      expect(store.loadDraft()).toBe(false);
    });

    it('clearDraft does not throw when localStorage.removeItem fails', () => {
      store.createDraft(makeConfig(), makePlayers());
      breakLocalStorage();
      expect(() => store.clearDraft()).not.toThrow();
    });

    it('savePlayerNames does not throw when localStorage.setItem fails', () => {
      breakLocalStorage();
      expect(() => store.savePlayerNames('Alice', 'Bob')).not.toThrow();
    });

    it('loadPlayerNames returns null and does not throw when localStorage.getItem fails', () => {
      breakLocalStorage();
      expect(() => store.loadPlayerNames()).not.toThrow();
      expect(store.loadPlayerNames()).toBeNull();
    });

    it('loadCurrentSeason falls back to 2026 when localStorage.getItem fails', () => {
      breakLocalStorage();
      store.loadCurrentSeason();
      expect(store.currentSeason).toBe(2026);
    });

    it('setCurrentSeason does not throw when localStorage.setItem fails', () => {
      breakLocalStorage();
      store.currentSeason = 2025; // force a different value so no-op guard is bypassed
      expect(() => store.setCurrentSeason(2024)).not.toThrow();
    });

    it('clearAll does not throw when every localStorage call fails', () => {
      store.createDraft(makeConfig(), makePlayers());
      breakLocalStorage();
      expect(() => store.clearAll()).not.toThrow();
    });
  });
});
