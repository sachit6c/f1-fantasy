// lib/draft-store.js
// Draft state management with localStorage persistence

import { DraftRules } from './draft-rules.js';
import { DEFAULT_DRAFT_CONFIG, DRAFT_STATUS } from './draft-config.js';

export class DraftStore {
  constructor() {
    this.draft = null;
    this.rules = null;
    this.listeners = [];
    this.DATA_VERSION = 2; // Increment when scoring system changes
    this.currentSeason = null; // Track active season
    
    // Load current season and draft
    this.loadCurrentSeason();
    this.loadDraft();
  }

  /**
   * Creates a new draft.
   * @param {Object} config - Draft configuration
   * @param {Array<Object>} players - Player objects [{ name, draftOrder }]
   * @returns {Object} - New draft object
   */
  createDraft(config = DEFAULT_DRAFT_CONFIG, players) {
    const draftId = `draft_${Date.now()}`;

    this.draft = {
      draftId,
      dataVersion: this.DATA_VERSION,
      season: config.season,
      status: DRAFT_STATUS.SETUP,
      players: players.map((p, idx) => ({
        playerId: `player_${idx + 1}`,
        name: p.name || `Player ${idx + 1}`,
        roster: [],
        draftOrder: p.draftOrder !== undefined ? p.draftOrder : idx
      })),
      picks: [],
      currentPickIndex: 0,
      config,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    this.rules = new DraftRules(config);

    this.saveDraft(); // Persist new draft immediately
    this.notifyListeners();
    return this.draft;
  }

  /**
   * Starts the draft (transitions from setup to in_progress).
   */
  startDraft() {
    if (!this.draft) throw new Error('No draft created');
    if (this.draft.status !== DRAFT_STATUS.SETUP) {
      throw new Error('Draft already started or completed');
    }

    this.draft.status = DRAFT_STATUS.IN_PROGRESS;
    this.saveDraft(); // Persist status change
    this.notifyListeners();
  }

  /**
   * Makes a pick for the current player. Automatically assigns ALL teammates to other player.
   * @param {string} driverId - Driver to draft
   * @param {Object} dataStore - Data store instance for teammate lookup
   * @returns {Object} - { success: boolean, error: string, pick: Object, teammatePicks: Array }
   */
  makePick(driverId, dataStore) {
    if (!this.draft || this.draft.status !== DRAFT_STATUS.IN_PROGRESS) {
      return { success: false, error: 'Draft not active' };
    }

    // Get current player
    const playerIndex = this.rules.getPlayerForPick(this.draft.currentPickIndex);
    const player = this.draft.players[playerIndex];

    // Get the other player
    const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
    const otherPlayer = this.draft.players[otherPlayerIndex];

    // Validate pick
    const draftedDrivers = this.draft.picks.map(p => p.driverId);
    const validation = this.rules.validatePick(driverId, draftedDrivers);

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Get ALL teammates (for teams with 2 or 3+ drivers)
    const teammates = dataStore.getTeammates(driverId);
    if (!teammates || teammates.length === 0) {
      return { success: false, error: 'Driver has no teammates' };
    }

    // Validate that none of the teammates have been picked
    for (const teammate of teammates) {
      if (draftedDrivers.includes(teammate.driverId)) {
        return { success: false, error: `Teammate ${teammate.name} already drafted` };
      }
    }

    // Create pick for current player
    const pick = {
      pickNumber: this.draft.currentPickIndex + 1,
      round: this.rules.getRoundForPick(this.draft.currentPickIndex),
      playerId: player.playerId,
      driverId,
      timestamp: new Date().toISOString()
    };

    // Create auto-picks for ALL teammates (assigned to other player)
    const teammatePicks = teammates.map(teammate => ({
      pickNumber: this.draft.currentPickIndex + 1,
      round: this.rules.getRoundForPick(this.draft.currentPickIndex),
      playerId: otherPlayer.playerId,
      driverId: teammate.driverId,
      timestamp: new Date().toISOString(),
      autoPicked: true // Flag to indicate this was auto-assigned
    }));

    // Add picks to history
    this.draft.picks.push(pick);
    teammatePicks.forEach(teammatePick => {
      this.draft.picks.push(teammatePick);
    });

    // Add drivers to rosters
    player.roster.push(driverId);
    teammates.forEach(teammate => {
      otherPlayer.roster.push(teammate.driverId);
    });

    // Advance pick index (only by 1, since all teammates are auto-assigned)
    this.draft.currentPickIndex++;

    // Check if draft is complete
    if (this.rules.isDraftComplete(this.draft.currentPickIndex)) {
      this.draft.status = DRAFT_STATUS.COMPLETED;
      this.draft.completedAt = new Date().toISOString();
    }

    this.notifyListeners();
    this.saveDraft(); // Persist to localStorage

    return { success: true, pick, teammatePicks };
  }

  /**
   * Undoes the last pick.
   * @returns {boolean}
   */
  undoLastPick() {
    if (!this.draft || this.draft.picks.length === 0) return false;

    const lastPick = this.draft.picks.pop();
    const player = this.draft.players.find(p => p.playerId === lastPick.playerId);

    if (player) {
      const index = player.roster.indexOf(lastPick.driverId);
      if (index > -1) {
        player.roster.splice(index, 1);
      }
    }

    this.draft.currentPickIndex--;

    if (this.draft.status === DRAFT_STATUS.COMPLETED) {
      this.draft.status = DRAFT_STATUS.IN_PROGRESS;
      this.draft.completedAt = null;
    }

    this.notifyListeners();
    this.saveDraft();

    return true;
  }

  /**
   * Undoes both picks in a pair (main pick + auto-paired teammate).
   * With auto-pairing, each selection creates 2 picks, so we undo both.
   * @returns {boolean}
   */
  undoPickPair() {
    if (!this.draft || this.draft.picks.length < 2) return false;

    // Remove both picks (teammate pick and main pick)
    const pick2 = this.draft.picks.pop();
    const pick1 = this.draft.picks.pop();

    // Remove from rosters
    [pick1, pick2].forEach(pick => {
      const player = this.draft.players.find(p => p.playerId === pick.playerId);
      if (player) {
        const index = player.roster.indexOf(pick.driverId);
        if (index > -1) {
          player.roster.splice(index, 1);
        }
      }
    });

    // Decrement pick index by 1 (not 2, because auto-pairing only advances by 1)
    this.draft.currentPickIndex--;

    if (this.draft.status === DRAFT_STATUS.COMPLETED) {
      this.draft.status = DRAFT_STATUS.IN_PROGRESS;
      this.draft.completedAt = null;
    }

    this.notifyListeners();
    this.saveDraft();

    return true;
  }

  /**
   * Removes a specific driver from a player's roster during their turn.
   * Also removes the auto-paired teammate from the other player's roster.
   * @param {string} driverId - The driver to remove
   * @param {Object} dataStore - DataStore instance to find teammate
   * @returns {boolean|Object} - Success status or error
   */
  removeDriverFromRoster(driverId, dataStore) {
    // Allow removal during draft or after completion (to undo picks)
    if (!this.draft || (this.draft.status !== DRAFT_STATUS.IN_PROGRESS && this.draft.status !== DRAFT_STATUS.COMPLETED)) {
      return { success: false, error: 'Draft is not available' };
    }

    // Find which player has this driver
    const owningPlayer = this.draft.players.find(p => p.roster.includes(driverId));
    if (!owningPlayer) {
      return { success: false, error: 'Driver not found in any roster' };
    }

    // Check turn permissions - when draft is IN_PROGRESS, enforce turn order
    // When draft is COMPLETED, allow any player to remove their own drivers
    if (this.draft.status === DRAFT_STATUS.IN_PROGRESS) {
      const currentPlayer = this.getCurrentPlayer();
      if (!currentPlayer || owningPlayer.playerId !== currentPlayer.playerId) {
        return { success: false, error: 'Can only remove drivers during your turn' };
      }
    }
    // If COMPLETED, the owningPlayer check above is sufficient - players can only remove their own drivers

    // Find the picks associated with this driver and ALL their teammates
    const teammates = dataStore.getTeammates(driverId);
    if (!teammates || teammates.length === 0) {
      return { success: false, error: 'Teammates not found' };
    }

    // Find the pick for this driver
    const driverPickIndex = this.draft.picks.findIndex(p => p.driverId === driverId);
    if (driverPickIndex === -1) {
      return { success: false, error: 'Pick record not found' };
    }

    const driverPick = this.draft.picks[driverPickIndex];

    // Prevent removal of auto-picked drivers (only allow removal of actively picked drivers)
    if (driverPick.autoPicked) {
      return { success: false, error: 'Cannot remove auto-assigned drivers. Remove the actively picked driver instead.' };
    }

    // Find all teammate picks
    const teammatePickIndexes = [];
    const teammateIds = [];
    for (const teammate of teammates) {
      const index = this.draft.picks.findIndex(p => p.driverId === teammate.driverId);
      if (index !== -1) {
        teammatePickIndexes.push(index);
        teammateIds.push(teammate.driverId);
      }
    }

    // Remove all picks (driver + all teammates) in reverse order to maintain indexes
    const allPickIndexes = [driverPickIndex, ...teammatePickIndexes].sort((a, b) => b - a);
    for (const index of allPickIndexes) {
      this.draft.picks.splice(index, 1);
    }

    // Remove driver from owning player's roster
    const driverRosterIndex = owningPlayer.roster.indexOf(driverId);
    if (driverRosterIndex > -1) {
      owningPlayer.roster.splice(driverRosterIndex, 1);
    }

    // Remove all teammates from other player's roster
    const otherPlayer = this.draft.players.find(p => p.playerId !== owningPlayer.playerId);
    if (otherPlayer) {
      for (const teammateId of teammateIds) {
        const teammateRosterIndex = otherPlayer.roster.indexOf(teammateId);
        if (teammateRosterIndex > -1) {
          otherPlayer.roster.splice(teammateRosterIndex, 1);
        }
      }
    }

    // Decrement pick index
    this.draft.currentPickIndex--;

    if (this.draft.status === DRAFT_STATUS.COMPLETED) {
      this.draft.status = DRAFT_STATUS.IN_PROGRESS;
      this.draft.completedAt = null;
    }

    this.notifyListeners();
    this.saveDraft();

    return { success: true, removedDriver: driverId, removedTeammates: teammateIds };
  }

  /**
   * Gets the current player whose turn it is.
   * @returns {Object|null} - Player object or null
   */
  getCurrentPlayer() {
    if (!this.draft || this.draft.status !== DRAFT_STATUS.IN_PROGRESS) return null;

    const playerIndex = this.rules.getPlayerForPick(this.draft.currentPickIndex);
    return this.draft.players[playerIndex];
  }

  /**
   * Gets all drafted driver IDs.
   * @returns {Array<string>}
   */
  getDraftedDrivers() {
    return this.draft ? this.draft.picks.map(p => p.driverId) : [];
  }

  /**
   * Checks if a driver has been drafted.
   * @param {string} driverId
   * @returns {boolean}
   */
  isDriverDrafted(driverId) {
    return this.getDraftedDrivers().includes(driverId);
  }

  /**
   * Gets the player who drafted a specific driver.
   * @param {string} driverId
   * @returns {Object|null} - Player object or null
   */
  getPlayerWhoPickedDriver(driverId) {
    if (!this.draft) return null;

    const pick = this.draft.picks.find(p => p.driverId === driverId);
    if (!pick) return null;

    return this.draft.players.find(p => p.playerId === pick.playerId);
  }

  /**
   * Saves draft to localStorage.
   */
  /**
   * Saves draft to localStorage (season-specific).
   */
  saveDraft() {
    if (!this.draft) return;

    try {
      const season = this.draft.season || this.currentSeason;
      localStorage.setItem(`f1_fantasy_draft_${season}`, JSON.stringify(this.draft));
      console.log(`[DraftStore] Saved ${season} draft to localStorage`);
    } catch (err) {
      console.warn('[DraftStore] Failed to save to localStorage:', err);
    }
  }

  /**
   * Loads draft from localStorage for the current season.
   * @returns {boolean} - True if draft loaded successfully
   */
  loadDraft() {
    try {
      if (!this.currentSeason) return false;
      
      const saved = localStorage.getItem(`f1_fantasy_draft_${this.currentSeason}`);
      if (!saved) return false;

      const draft = JSON.parse(saved);

      // Check data version - clear if outdated
      if (!draft.dataVersion || draft.dataVersion < this.DATA_VERSION) {
        console.warn(`[DraftStore] Outdated data version (${draft.dataVersion || 0}). Clearing...`);
        this.clearDraft();
        return false;
      }

      this.draft = draft;
      this.rules = new DraftRules(this.draft.config);

      this.notifyListeners();
      console.log(`[DraftStore] Loaded ${this.currentSeason} draft from localStorage`);
      return true;
    } catch (err) {
      console.warn('[DraftStore] Failed to load from localStorage:', err);
      return false;
    }
  }

  /**
   * Clears draft for current season only.
   */
  clearDraft() {
    this.draft = null;
    this.rules = null;

    try {
      if (this.currentSeason) {
        localStorage.removeItem(`f1_fantasy_draft_${this.currentSeason}`);
        console.log(`[DraftStore] Cleared ${this.currentSeason} draft`);
      }
    } catch (err) {
      console.warn('[DraftStore] Failed to clear localStorage:', err);
    }

    this.notifyListeners();
  }

  /**
   * Saves player names separately (persists across seasons).
   */
  savePlayerNames(player1Name, player2Name, draftType = 'snake') {
    try {
      const playerNames = { player1: player1Name, player2: player2Name, draftType };
      localStorage.setItem('f1_fantasy_player_names', JSON.stringify(playerNames));
      console.log('[DraftStore] Saved player names');
    } catch (err) {
      console.warn('[DraftStore] Failed to save player names:', err);
    }
  }

  /**
   * Loads saved player names.
   * @returns {Object|null} - { player1, player2 } or null
   */
  loadPlayerNames() {
    try {
      const saved = localStorage.getItem('f1_fantasy_player_names');
      if (!saved) return null;

      const playerNames = JSON.parse(saved);
      console.log('[DraftStore] Loaded player names');
      return playerNames;
    } catch (err) {
      console.warn('[DraftStore] Failed to load player names:', err);
      return null;
    }
  }

  /**
   * Clears everything including player names and all season drafts (New Season).
   */
  clearAll() {
    // Clear all season drafts
    [2021, 2022, 2025, 2026].forEach(season => {
      try {
        localStorage.removeItem(`f1_fantasy_draft_${season}`);
        console.log(`[DraftStore] Cleared ${season} draft`);
      } catch (err) {
        console.warn(`[DraftStore] Failed to clear ${season} draft:`, err);
      }
    });

    // Clear player names
    try {
      localStorage.removeItem('f1_fantasy_player_names');
      console.log('[DraftStore] Cleared player names');
    } catch (err) {
      console.warn('[DraftStore] Failed to clear player names:', err);
    }

    // Clear current season
    try {
      localStorage.removeItem('f1_fantasy_current_season');
      console.log('[DraftStore] Cleared current season');
    } catch (err) {
      console.warn('[DraftStore] Failed to clear current season:', err);
    }

    this.draft = null;
    this.rules = null;
    this.currentSeason = null;
    this.notifyListeners();
  }

  /**
   * Loads the current active season from localStorage.
   */
  loadCurrentSeason() {
    try {
      const saved = localStorage.getItem('f1_fantasy_current_season');
      this.currentSeason = saved ? parseInt(saved) : 2026; // Default to 2026
      console.log(`[DraftStore] Current season: ${this.currentSeason}`);
    } catch (err) {
      console.warn('[DraftStore] Failed to load current season:', err);
      this.currentSeason = 2026;
    }
  }

  /**
   * Sets the current active season and switches to that season's draft.
   * @param {number} season - Season year (2025 or 2026)
   */
  setCurrentSeason(season) {
    if (this.currentSeason === season) return; // No change
    
    this.currentSeason = season;
    
    try {
      localStorage.setItem('f1_fantasy_current_season', season.toString());
      console.log(`[DraftStore] Switched to ${season} season`);
    } catch (err) {
      console.warn('[DraftStore] Failed to save current season:', err);
    }

    // Load the draft for this season
    this.loadDraft();
    this.notifyListeners();
  }

  /**
   * Subscribes to draft state changes.
   * @param {Function} callback - Function to call when state changes
   * @returns {Function} - Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notifies all listeners of state change.
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.draft));
  }

  /**
   * Gets draft progress stats.
   * @returns {Object}
   */
  getProgress() {
    if (!this.draft || !this.rules) {
      return { totalPicks: 0, picksMade: 0, percentComplete: 0 };
    }

    const totalPicks = this.rules.getTotalPicks();
    // Use currentPickIndex instead of picks.length because auto-pairing creates 2 picks per selection
    const picksMade = this.draft.currentPickIndex;
    const percentComplete = Math.round((picksMade / totalPicks) * 100);

    return { totalPicks, picksMade, percentComplete };
  }
}

// Singleton instance
export const draftStore = new DraftStore();
