// lib/fantasy-scoring-config.js
// Fantasy scoring configuration and presets

export const DEFAULT_FANTASY_SCORING = {
  // Race finish position points (mirroring F1 official points)
  racePosition: {
    1: 25,
    2: 18,
    3: 15,
    4: 12,
    5: 10,
    6: 8,
    7: 6,
    8: 4,
    9: 2,
    10: 1
    // Positions 11-20: 0 points
  },

  // Qualifying bonus points (optional)
  qualifyingBonus: {
    enabled: true,
    1: 5,   // Pole position
    2: 3,
    3: 2,
    4: 1,
    5: 1
    // Positions 6-20: 0 bonus
  },

  // Sprint race points
  sprintPosition: {
    enabled: true,
    1: 8,
    2: 7,
    3: 6,
    4: 5,
    5: 4,
    6: 3,
    7: 2,
    8: 1
    // Positions 9-20: 0 points
  },

  // Bonus points
  bonuses: {
    fastestLap: {
      enabled: true,
      points: 2,
      requiresTopTenFinish: false  // If true, only award if driver finishes in top 10
    },
    podium: {
      enabled: false,  // Additional bonus beyond position points
      points: 3
    },
    beatTeammate: {
      enabled: false,  // Bonus for out-finishing teammate
      points: 2
    }
  },

  // Penalties
  penalties: {
    dnf: {
      enabled: true,
      points: -5  // Did Not Finish penalty
    },
    disqualified: {
      enabled: true,
      points: -10  // Disqualification penalty
    },
    dns: {
      enabled: true,
      points: -3  // Did Not Start penalty
    }
  },

  // Meta settings
  countAllRaces: true,  // If false, drop worst N races
  dropWorstRaces: 0     // Number of worst races to drop (e.g., 2)
};

export const SCORING_PRESETS = {
  // Standard scoring (default)
  standard: DEFAULT_FANTASY_SCORING,

  // High variance (bigger bonuses/penalties)
  highVariance: {
    ...DEFAULT_FANTASY_SCORING,
    bonuses: {
      ...DEFAULT_FANTASY_SCORING.bonuses,
      fastestLap: { enabled: true, points: 5, requiresTopTenFinish: false },
      podium: { enabled: true, points: 5 }
    },
    penalties: {
      dnf: { enabled: true, points: -10 },
      disqualified: { enabled: true, points: -15 },
      dns: { enabled: true, points: -5 }
    }
  },

  // Conservative (no penalties)
  conservative: {
    ...DEFAULT_FANTASY_SCORING,
    penalties: {
      dnf: { enabled: false, points: 0 },
      disqualified: { enabled: false, points: 0 },
      dns: { enabled: false, points: 0 }
    }
  }
};
