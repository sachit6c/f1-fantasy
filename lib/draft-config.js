// lib/draft-config.js
// Draft configuration constants

export const DEFAULT_DRAFT_CONFIG = {
  draftType: 'snake', // Always snake, not configurable
  playerCount: 2,
  allowDuplicates: false,
  season: 2026 // Supported: 2025, 2026
  // rosterSize is calculated dynamically based on available teams
};

export const DRAFT_TYPES = {
  SNAKE: 'snake',
  FIXED: 'fixed' // Kept for backward compatibility, but not used
};

export const DRAFT_STATUS = {
  SETUP: 'setup',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
};

/**
 * Creates draft config with auto-calculated roster size.
 * @param {Object} dataStore - Data store instance
 * @param {number} season - Season year
 * @returns {Object} - Draft configuration
 */
export function createDraftConfig(dataStore, season = 2026) {
  const teamCount = dataStore.getTeamCount();
  const rosterSize = teamCount; // Each player gets one driver from each team (10 teams = 10 drivers each)

  return {
    ...DEFAULT_DRAFT_CONFIG,
    rosterSize,
    season
  };
}
