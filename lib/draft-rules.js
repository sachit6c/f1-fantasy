// lib/draft-rules.js
// Draft rules and logic

export class DraftRules {
  constructor(config) {
    this.config = config;
  }

  /**
   * Calculates total number of picks in the draft.
   * With auto-pairing, each pick assigns 2 drivers (one to each player).
   * So total picks = roster size (number of teams/drivers per player)
   * @returns {number}
   */
  getTotalPicks() {
    // With auto-pairing: 10 teams = 10 picks (each assigns 2 drivers)
    return this.config.rosterSize;
  }

  /**
   * Determines which player should pick for a given pick index.
   * @param {number} pickIndex - 0-based pick index
   * @returns {number} - Player draft order (0 or 1 for array index)
   */
  getPlayerForPick(pickIndex) {
    const { playerCount, draftType } = this.config;

    if (draftType === 'snake' || draftType === 'random_snake') {
      const round = Math.floor(pickIndex / playerCount);
      const positionInRound = pickIndex % playerCount;

      // Odd rounds reverse order
      let player = round % 2 === 1
        ? playerCount - 1 - positionInRound
        : positionInRound;

      // random_snake: offset all positions by the seed (who picks first)
      if (draftType === 'random_snake') {
        const seed = this.config.pickOrderSeed || 0;
        player = (player + seed) % playerCount;
      }

      return player;
    }

    if (draftType === 'linear') {
      return pickIndex % playerCount;
    }

    // Fallback (fixed / unknown): simple alternating
    return pickIndex % playerCount;
  }

  /**
   * Calculates the round number for a pick index.
   * @param {number} pickIndex - 0-based pick index
   * @returns {number} - 1-based round number
   */
  getRoundForPick(pickIndex) {
    return Math.floor(pickIndex / this.config.playerCount) + 1;
  }

  /**
   * Validates if a driver can be drafted.
   * @param {string} driverId - Driver to validate
   * @param {Array<string>} draftedDrivers - Already drafted driver IDs
   * @returns {Object} - { valid: boolean, reason: string }
   */
  validatePick(driverId, draftedDrivers) {
    // Check if already drafted
    if (draftedDrivers.includes(driverId)) {
      return { valid: false, reason: 'Driver already drafted' };
    }

    return { valid: true, reason: null };
  }

  /**
   * Checks if draft is complete.
   * @param {number} pickCount - Number of picks made
   * @returns {boolean}
   */
  isDraftComplete(pickCount) {
    return pickCount >= this.getTotalPicks();
  }

  /**
   * Checks if a player's roster is full.
   * @param {Array<string>} roster - Player's current roster
   * @returns {boolean}
   */
  isRosterFull(roster) {
    return roster.length >= this.config.rosterSize;
  }
}
