// lib/draft-config.js
// Draft configuration constants

export const DEFAULT_DRAFT_CONFIG = {
  draftType: 'snake', // Default; configurable at draft creation
  playerCount: 2,
  allowDuplicates: false,
  season: 2026 // Supported: 2025, 2026
  // rosterSize is calculated dynamically based on available teams
};

export const DRAFT_TYPES = {
  SNAKE: 'snake',
  LINEAR: 'linear',
  RANDOM_SNAKE: 'random_snake',
  FIXED: 'fixed' // Kept for backward compatibility
};

/**
 * Metadata for each draft type used in the setup UI.
 */
export const DRAFT_TYPE_META = {
  snake: {
    label: 'Snake Draft',
    description: 'Order reverses each round: A→B→B→A→A→B…'
  },
  linear: {
    label: 'Linear Draft',
    description: 'Same order every round: A→B→A→B…'
  },
  random_snake: {
    label: 'Random Snake',
    description: 'Coin-flip decides who picks first, then snakes'
  }
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
export function createDraftConfig(dataStore, season = 2026, draftType = 'snake') {
  const teamCount = dataStore.getTeamCount();
  const rosterSize = teamCount; // Each player gets one driver from each team (10 teams = 10 drivers each)

  const config = {
    ...DEFAULT_DRAFT_CONFIG,
    draftType,
    rosterSize,
    season
  };

  // For random_snake, randomly determine who picks first (0 or 1) at creation time
  if (draftType === 'random_snake') {
    config.pickOrderSeed = Math.floor(Math.random() * 2);
  }

  return config;
}
