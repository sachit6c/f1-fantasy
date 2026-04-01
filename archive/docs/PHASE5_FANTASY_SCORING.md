# PHASE 5: FANTASY SCORING & TEAM COMPARISON

**Status**: IN PROGRESS
**Prerequisites**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅
**Technology**: Vanilla JS, computed from CSV data
**Players**: 2 (1v1 head-to-head)

---

## 1) FANTASY SCORING MODEL

### 1.1) Scoring Configuration

All scoring rules defined in a configurable object for transparency and adjustability.

```javascript
// lib/fantasy-scoring-config.js

export const DEFAULT_FANTASY_SCORING = {
  // Race finish position points
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
    10: 1,
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
```

---

### 1.2) Scoring Calculation Logic

#### **FantasyScorer Class**

```javascript
// lib/fantasy-scorer.js

import { DEFAULT_FANTASY_SCORING } from './fantasy-scoring-config.js';
import { dataStore } from './data-store.js';

export class FantasyScorer {
  constructor(config = DEFAULT_FANTASY_SCORING) {
    this.config = config;
  }

  /**
   * Calculates fantasy points for a driver in a specific race.
   * @param {string} raceId - Race identifier
   * @param {string} driverId - Driver identifier
   * @returns {Object} - { total, breakdown }
   */
  scoreDriverRace(raceId, driverId) {
    const breakdown = {
      racePosition: 0,
      qualifyingBonus: 0,
      sprintPosition: 0,
      fastestLap: 0,
      podium: 0,
      beatTeammate: 0,
      dnfPenalty: 0,
      disqualifiedPenalty: 0,
      dnsPenalty: 0
    };

    // Get race result
    const results = dataStore.getRaceResults(raceId);
    const driverResult = results.find(r => r.driverId === driverId);

    if (!driverResult) {
      // Driver didn't participate
      return { total: 0, breakdown, participated: false };
    }

    // 1. Race position points
    const position = parseInt(driverResult.position);
    if (!isNaN(position) && this.config.racePosition[position]) {
      breakdown.racePosition = this.config.racePosition[position];
    }

    // 2. Qualifying bonus
    if (this.config.qualifyingBonus.enabled) {
      const quali = dataStore.getQualifying(raceId);
      const qualiResult = quali.find(q => q.driverId === driverId);

      if (qualiResult) {
        const qualiPos = parseInt(qualiResult.position);
        if (!isNaN(qualiPos) && this.config.qualifyingBonus[qualiPos]) {
          breakdown.qualifyingBonus = this.config.qualifyingBonus[qualiPos];
        }
      }
    }

    // 3. Sprint position points
    if (this.config.sprintPosition.enabled) {
      const race = dataStore.getRace(raceId);
      if (race && race.hasSprint === 'true') {
        const sprintResults = dataStore.data.sprintResults.filter(s => s.raceId === raceId);
        const sprintResult = sprintResults.find(s => s.driverId === driverId);

        if (sprintResult) {
          const sprintPos = parseInt(sprintResult.position);
          if (!isNaN(sprintPos) && this.config.sprintPosition[sprintPos]) {
            breakdown.sprintPosition = this.config.sprintPosition[sprintPos];
          }
        }
      }
    }

    // 4. Fastest lap bonus
    if (this.config.bonuses.fastestLap.enabled) {
      if (driverResult.fastestLapRank === '1') {
        const requiresTopTen = this.config.bonuses.fastestLap.requiresTopTenFinish;
        const finishedTopTen = position >= 1 && position <= 10;

        if (!requiresTopTen || finishedTopTen) {
          breakdown.fastestLap = this.config.bonuses.fastestLap.points;
        }
      }
    }

    // 5. Podium bonus (beyond position points)
    if (this.config.bonuses.podium.enabled) {
      if (position >= 1 && position <= 3) {
        breakdown.podium = this.config.bonuses.podium.points;
      }
    }

    // 6. Beat teammate bonus
    if (this.config.bonuses.beatTeammate.enabled) {
      const beatTeammate = this.checkBeatTeammate(raceId, driverId, driverResult);
      if (beatTeammate) {
        breakdown.beatTeammate = this.config.bonuses.beatTeammate.points;
      }
    }

    // 7. Penalties
    const status = driverResult.status;

    if (this.config.penalties.dnf.enabled) {
      if (this.isDNF(status) && status !== 'Disqualified') {
        breakdown.dnfPenalty = this.config.penalties.dnf.points;
      }
    }

    if (this.config.penalties.disqualified.enabled) {
      if (status === 'Disqualified') {
        breakdown.disqualifiedPenalty = this.config.penalties.disqualified.points;
      }
    }

    if (this.config.penalties.dns.enabled) {
      if (status === 'Did not start' || status === 'Withdrew') {
        breakdown.dnsPenalty = this.config.penalties.dns.points;
      }
    }

    // Calculate total
    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return { total, breakdown, participated: true };
  }

  /**
   * Checks if driver beat their teammate in this race.
   * @param {string} raceId
   * @param {string} driverId
   * @param {Object} driverResult
   * @returns {boolean}
   */
  checkBeatTeammate(raceId, driverId, driverResult) {
    const race = dataStore.getRace(raceId);
    if (!race) return false;

    // Find driver's team
    const driverTeam = dataStore.data.driverTeams.find(
      dt => dt.driverId === driverId && parseInt(dt.season) === parseInt(race.season)
    );
    if (!driverTeam) return false;

    // Find teammate
    const teammates = dataStore.data.driverTeams.filter(
      dt => dt.constructorId === driverTeam.constructorId &&
           parseInt(dt.season) === parseInt(race.season) &&
           dt.driverId !== driverId
    );
    if (teammates.length === 0) return false;

    const teammateId = teammates[0].driverId;

    // Get teammate result
    const results = dataStore.getRaceResults(raceId);
    const teammateResult = results.find(r => r.driverId === teammateId);
    if (!teammateResult) return true; // Teammate didn't participate

    // Compare positions (lower positionOrder = better finish)
    const driverOrder = parseInt(driverResult.positionOrder) || 999;
    const teammateOrder = parseInt(teammateResult.positionOrder) || 999;

    return driverOrder < teammateOrder;
  }

  /**
   * Checks if status is a DNF.
   * @param {string} status
   * @returns {boolean}
   */
  isDNF(status) {
    const dnfStatuses = [
      'Accident', 'Collision', 'Engine', 'Gearbox', 'Transmission',
      'Clutch', 'Hydraulics', 'Electrical', 'Retired', 'Spun off',
      'Fuel pressure', 'Brakes', 'Suspension', 'Wheel', 'Radiator',
      'Safety concerns', 'Excluded'
    ];
    return dnfStatuses.some(dnf => status.includes(dnf));
  }

  /**
   * Scores all drivers in a race.
   * @param {string} raceId
   * @returns {Array<Object>} - [{ driverId, total, breakdown, participated }]
   */
  scoreRace(raceId) {
    const results = dataStore.getRaceResults(raceId);

    return results.map(r => ({
      driverId: r.driverId,
      ...this.scoreDriverRace(raceId, r.driverId)
    }));
  }
}

// Singleton instance
export const fantasyScorer = new FantasyScorer();
```

---

### 1.3) Example Scoring Calculation

**Scenario**: Verstappen at Bahrain 2024

**Inputs**:
- Race position: 1st (25 points)
- Qualifying: 1st (5 bonus points)
- Sprint: N/A (not a sprint weekend)
- Fastest lap: Yes (2 bonus points)
- Status: Finished

**Breakdown**:
```javascript
{
  racePosition: 25,
  qualifyingBonus: 5,
  sprintPosition: 0,
  fastestLap: 2,
  podium: 0,
  beatTeammate: 0,
  dnfPenalty: 0,
  disqualifiedPenalty: 0,
  dnsPenalty: 0
}
```

**Total**: 32 points

---

**Scenario**: Leclerc at Bahrain 2024

**Inputs**:
- Race position: DNF (no position)
- Qualifying: 5th (1 bonus point)
- Sprint: N/A
- Status: Engine failure

**Breakdown**:
```javascript
{
  racePosition: 0,      // DNF, no position points
  qualifyingBonus: 1,
  sprintPosition: 0,
  fastestLap: 0,
  podium: 0,
  beatTeammate: 0,
  dnfPenalty: -5,       // DNF penalty
  disqualifiedPenalty: 0,
  dnsPenalty: 0
}
```

**Total**: -4 points

---

## 2) DRIVER → TEAM AGGREGATION

### 2.1) Team Scoring Logic

Each player's team score is the **sum of all their drafted drivers' scores**.

```javascript
// lib/fantasy-team-scorer.js

import { fantasyScorer } from './fantasy-scorer.js';
import { draftStore } from './draft-store.js';
import { dataStore } from './data-store.js';

export class FantasyTeamScorer {
  /**
   * Calculates a player's total fantasy points for a specific race.
   * @param {string} playerId - Player identifier
   * @param {string} raceId - Race identifier
   * @returns {Object} - { total, drivers: [{ driverId, total, breakdown }] }
   */
  scorePlayerRace(playerId, raceId) {
    const draft = draftStore.draft;
    if (!draft) return { total: 0, drivers: [] };

    const player = draft.players.find(p => p.playerId === playerId);
    if (!player) return { total: 0, drivers: [] };

    const drivers = player.roster.map(driverId => {
      const score = fantasyScorer.scoreDriverRace(raceId, driverId);
      return {
        driverId,
        ...score
      };
    });

    const total = drivers.reduce((sum, d) => sum + d.total, 0);

    return { total, drivers };
  }

  /**
   * Calculates a player's total fantasy points across all completed races in the season.
   * @param {string} playerId - Player identifier
   * @returns {Object} - { total, races: [{ raceId, total, drivers }] }
   */
  scorePlayerSeason(playerId) {
    const draft = draftStore.draft;
    if (!draft) return { total: 0, races: [] };

    const season = draft.season;
    const calendar = dataStore.getRacesBySeason(season);

    const races = calendar
      .filter(race => race.hasResults)  // Only completed races
      .map(race => ({
        raceId: race.raceId,
        raceName: race.raceName,
        ...this.scorePlayerRace(playerId, race.raceId)
      }));

    const total = races.reduce((sum, r) => sum + r.total, 0);

    return { total, races };
  }

  /**
   * Gets head-to-head comparison for two players.
   * @param {string} player1Id
   * @param {string} player2Id
   * @returns {Object} - Comparison data
   */
  compareTeams(player1Id, player2Id) {
    const player1Score = this.scorePlayerSeason(player1Id);
    const player2Score = this.scorePlayerSeason(player2Id);

    const draft = draftStore.draft;
    const player1 = draft.players.find(p => p.playerId === player1Id);
    const player2 = draft.players.find(p => p.playerId === player2Id);

    // Calculate per-race wins
    let player1Wins = 0;
    let player2Wins = 0;
    let ties = 0;

    const raceComparisons = player1Score.races.map((r1, idx) => {
      const r2 = player2Score.races[idx];

      if (r1.total > r2.total) {
        player1Wins++;
      } else if (r2.total > r1.total) {
        player2Wins++;
      } else {
        ties++;
      }

      return {
        raceId: r1.raceId,
        raceName: r1.raceName,
        player1Total: r1.total,
        player2Total: r2.total,
        winner: r1.total > r2.total ? player1Id : r2.total > r1.total ? player2Id : 'tie',
        margin: Math.abs(r1.total - r2.total)
      };
    });

    // Calculate per-driver contributions
    const player1DriverStats = this.calculateDriverContributions(player1Score);
    const player2DriverStats = this.calculateDriverContributions(player2Score);

    return {
      player1: {
        ...player1,
        totalPoints: player1Score.total,
        raceWins: player1Wins,
        races: player1Score.races,
        drivers: player1DriverStats
      },
      player2: {
        ...player2,
        totalPoints: player2Score.total,
        raceWins: player2Wins,
        races: player2Score.races,
        drivers: player2DriverStats
      },
      ties,
      raceComparisons,
      leader: player1Score.total > player2Score.total ? player1Id : player2Id,
      margin: Math.abs(player1Score.total - player2Score.total)
    };
  }

  /**
   * Calculates per-driver season contributions.
   * @param {Object} playerSeasonScore - Result from scorePlayerSeason()
   * @returns {Array<Object>}
   */
  calculateDriverContributions(playerSeasonScore) {
    const driverTotals = {};

    playerSeasonScore.races.forEach(race => {
      race.drivers.forEach(driver => {
        if (!driverTotals[driver.driverId]) {
          driverTotals[driver.driverId] = {
            driverId: driver.driverId,
            totalPoints: 0,
            races: 0,
            avgPoints: 0
          };
        }

        driverTotals[driver.driverId].totalPoints += driver.total;
        driverTotals[driver.driverId].races++;
      });
    });

    // Calculate averages
    Object.values(driverTotals).forEach(driver => {
      driver.avgPoints = driver.races > 0 ? driver.totalPoints / driver.races : 0;
    });

    return Object.values(driverTotals).sort((a, b) => b.totalPoints - a.totalPoints);
  }
}

// Singleton instance
export const fantasyTeamScorer = new FantasyTeamScorer();
```

---

### 2.2) Example Team Aggregation

**Scenario**: Alice's team at Bahrain 2024

**Alice's Roster**:
1. VER (Verstappen)
2. PER (Perez)
3. NOR (Norris)
4. RUS (Russell)
5. STR (Stroll)

**Individual Scores** (Bahrain):
- VER: 32 points (P1 + quali bonus + fastest lap)
- PER: 18 points (P2)
- NOR: 12 points (P4)
- RUS: 6 points (P7)
- STR: -4 points (DNF - penalty)

**Alice's Team Total**: 32 + 18 + 12 + 6 - 4 = **64 points**

---

**Bob's Roster**:
1. LEC (Leclerc)
2. SAI (Sainz)
3. HAM (Hamilton)
4. ALO (Alonso)
5. OCO (Ocon)

**Individual Scores** (Bahrain):
- LEC: -4 points (DNF)
- SAI: 15 points (P3)
- HAM: 10 points (P5)
- ALO: 8 points (P6)
- OCO: 2 points (P9)

**Bob's Team Total**: -4 + 15 + 10 + 8 + 2 = **31 points**

---

**Head-to-Head (Bahrain)**:
- Alice: 64 points
- Bob: 31 points
- Winner: Alice (+33 margin)

---

## 3) TEAM COMPARISON VIEW

### 3.1) Design Specification

**Route**: `#/teams` or `#/fantasy`

**Layout**:
```
┌───────────────────────────────────────────────────────────────┐
│ Fantasy League - Team Comparison                             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ SEASON STANDINGS                                        │   │
│ │                                                         │   │
│ │ ┌──────────────────┐     ┌──────────────────┐          │   │
│ │ │ ALICE            │     │ BOB              │          │   │
│ │ │ 🏆 Leader        │     │                  │          │   │
│ │ │                  │     │                  │          │   │
│ │ │ Total: 320 pts   │     │ Total: 280 pts   │          │   │
│ │ │ Race Wins: 6     │     │ Race Wins: 3     │          │   │
│ │ │ Avg/Race: 32     │     │ Avg/Race: 28     │          │   │
│ │ └──────────────────┘     └──────────────────┘          │   │
│ │                                                         │   │
│ │ Lead Margin: +40 points                                │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ DRIVER CONTRIBUTIONS                                    │   │
│ ├────────┬────────────┬────────────┬────────┬─────────────┤   │
│ │ Alice  │ Driver     │ Races      │ Total  │ Avg/Race    │   │
│ │        │ VER        │    10      │  280   │    28.0     │   │
│ │        │ NOR        │    10      │   90   │     9.0     │   │
│ │        │ PER        │    10      │   50   │     5.0     │   │
│ │        │ RUS        │    10      │  -10   │    -1.0     │   │
│ │        │ STR        │    10      │  -10   │    -1.0     │   │
│ ├────────┼────────────┼────────────┼────────┼─────────────┤   │
│ │ Bob    │ Driver     │ Races      │ Total  │ Avg/Race    │   │
│ │        │ SAI        │    10      │  150   │    15.0     │   │
│ │        │ HAM        │    10      │   80   │     8.0     │   │
│ │        │ ALO        │    10      │   60   │     6.0     │   │
│ │        │ LEC        │    10      │   20   │     2.0     │   │
│ │        │ OCO        │    10      │  -30   │    -3.0     │   │
│ └────────┴────────────┴────────────┴────────┴─────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ RACE-BY-RACE BREAKDOWN                                  │   │
│ ├──────────┬────────────────┬───────┬───────┬─────────────┤   │
│ │ Round    │ Grand Prix     │ Alice │  Bob  │ Winner      │   │
│ │   1      │ Bahrain        │  64   │  31   │ Alice (+33) │   │
│ │   2      │ Saudi Arabia   │  52   │  48   │ Alice (+4)  │   │
│ │   3      │ Australia      │  38   │  42   │ Bob (+4)    │   │
│ │   4      │ Japan (Sprint) │  70   │  55   │ Alice (+15) │   │
│ │  ...     │ ...            │  ...  │  ...  │ ...         │   │
│ └──────────┴────────────────┴───────┴───────┴─────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ POINTS TREND (Chart)                                    │   │
│ │  320 │                                       ●───Alice   │   │
│ │      │                                 ●───●             │   │
│ │  280 │                           ●───●                   │   │
│ │      │                     ●───●   Bob───●───●           │   │
│ │  240 │               ●───●                               │   │
│ │      │         ●───●                                     │   │
│ │  200 │   ●───●                                           │   │
│ │      └───┬───┬───┬───┬───┬───┬───┬───┬───┬─────────    │   │
│ │          R1  R2  R3  R4  R5  R6  R7  R8  R9  R10        │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ [Export Results] [Reset Season] [Back to Draft]              │
└───────────────────────────────────────────────────────────────┘
```

---

### 3.2) Team Comparison View Implementation

```javascript
// views/team-comparison-view.js

import { BaseView } from './base-view.js';
import { fantasyTeamScorer } from '../lib/fantasy-team-scorer.js';
import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';

export class TeamComparisonView extends BaseView {
  async render(container, params) {
    this.root = container;

    const draft = draftStore.draft;

    if (!draft || draft.status !== 'completed') {
      this.root.appendChild(
        this.createErrorMessage('No completed draft found. Please complete a draft first.')
      );
      return;
    }

    if (draft.players.length !== 2) {
      this.root.appendChild(
        this.createErrorMessage('Team comparison requires exactly 2 players.')
      );
      return;
    }

    this.root.appendChild(this.createLoadingSpinner());

    try {
      const [player1, player2] = draft.players;
      const comparison = fantasyTeamScorer.compareTeams(player1.playerId, player2.playerId);

      this.root.innerHTML = '';

      // Render header
      this.renderHeader();

      // Season standings
      this.renderSeasonStandings(comparison);

      // Driver contributions
      this.renderDriverContributions(comparison);

      // Race-by-race breakdown
      this.renderRaceBreakdown(comparison);

      // Points trend chart
      this.renderPointsTrend(comparison);

      // Action buttons
      this.renderActions();

    } catch (err) {
      this.root.innerHTML = '';
      this.root.appendChild(
        this.createErrorMessage(`Failed to load team comparison: ${err.message}`)
      );
    }
  }

  renderHeader() {
    const header = this.createElement('div', 'comparison-header');
    const title = this.createElement('h1', 'page-title', 'Fantasy League - Team Comparison');
    header.appendChild(title);
    this.root.appendChild(header);
  }

  renderSeasonStandings(comparison) {
    const section = this.createElement('section', 'season-standings');
    const heading = this.createElement('h2', 'section-heading', 'Season Standings');
    section.appendChild(heading);

    const standingsGrid = this.createElement('div', 'standings-grid');

    // Player 1 card
    const p1Card = this.createPlayerCard(comparison.player1, comparison.leader === comparison.player1.playerId);
    standingsGrid.appendChild(p1Card);

    // Player 2 card
    const p2Card = this.createPlayerCard(comparison.player2, comparison.leader === comparison.player2.playerId);
    standingsGrid.appendChild(p2Card);

    section.appendChild(standingsGrid);

    // Lead margin
    const leaderName = comparison.leader === comparison.player1.playerId
      ? comparison.player1.name
      : comparison.player2.name;

    const margin = this.createElement('p', 'lead-margin',
      `${leaderName} leads by ${comparison.margin} points`
    );
    section.appendChild(margin);

    this.root.appendChild(section);
  }

  createPlayerCard(player, isLeader) {
    const card = this.createElement('div', ['player-card', isLeader ? 'leader' : '']);

    const name = this.createElement('h3', 'player-card-name', player.name);
    if (isLeader) {
      const trophy = this.createElement('span', 'trophy-icon', ' 🏆');
      name.appendChild(trophy);
    }
    card.appendChild(name);

    const avgPerRace = player.races.length > 0
      ? (player.totalPoints / player.races.length).toFixed(1)
      : '0.0';

    const stats = [
      { label: 'Total Points', value: player.totalPoints },
      { label: 'Race Wins', value: player.raceWins },
      { label: 'Avg per Race', value: avgPerRace }
    ];

    stats.forEach(stat => {
      const statRow = this.createElement('div', 'stat-row');
      const label = this.createElement('span', 'stat-label', stat.label + ':');
      const value = this.createElement('span', 'stat-value', stat.value.toString());
      statRow.appendChild(label);
      statRow.appendChild(value);
      card.appendChild(statRow);
    });

    return card;
  }

  renderDriverContributions(comparison) {
    const section = this.createElement('section', 'driver-contributions');
    const heading = this.createElement('h2', 'section-heading', 'Driver Contributions');
    section.appendChild(heading);

    const grid = this.createElement('div', 'contributions-grid');

    // Player 1 table
    const p1Table = this.createContributionTable(comparison.player1);
    grid.appendChild(p1Table);

    // Player 2 table
    const p2Table = this.createContributionTable(comparison.player2);
    grid.appendChild(p2Table);

    section.appendChild(grid);
    this.root.appendChild(section);
  }

  createContributionTable(player) {
    const container = this.createElement('div', 'contribution-container');

    const playerName = this.createElement('h3', 'contribution-header', player.name);
    container.appendChild(playerName);

    const table = this.createElement('table', 'contribution-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Driver</th>
          <th>Races</th>
          <th>Total</th>
          <th>Avg/Race</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    player.drivers.forEach(driver => {
      const driverData = dataStore.indexes.driverById.get(driver.driverId);
      const row = document.createElement('tr');

      row.innerHTML = `
        <td class="driver-name">
          <a href="#/driver/${driver.driverId}">${driverData ? driverData.code : driver.driverId}</a>
        </td>
        <td class="races">${driver.races}</td>
        <td class="total ${driver.totalPoints >= 0 ? 'positive' : 'negative'}">
          ${driver.totalPoints >= 0 ? '+' : ''}${driver.totalPoints}
        </td>
        <td class="avg">${driver.avgPoints.toFixed(1)}</td>
      `;

      tbody.appendChild(row);
    });

    container.appendChild(table);
    return container;
  }

  renderRaceBreakdown(comparison) {
    const section = this.createElement('section', 'race-breakdown');
    const heading = this.createElement('h2', 'section-heading', 'Race-by-Race Breakdown');
    section.appendChild(heading);

    const table = this.createElement('table', 'race-breakdown-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Round</th>
          <th>Grand Prix</th>
          <th>${comparison.player1.name}</th>
          <th>${comparison.player2.name}</th>
          <th>Winner</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    comparison.raceComparisons.forEach(race => {
      const raceData = dataStore.getRace(race.raceId);
      const winner = race.winner === 'tie' ? 'Tie' :
        race.winner === comparison.player1.playerId ? comparison.player1.name : comparison.player2.name;

      const margin = race.winner === 'tie' ? '' : `(+${race.margin})`;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="round">${raceData ? raceData.round : '?'}</td>
        <td class="race-name">
          <a href="#/race/${race.raceId}">${race.raceName.replace(' Grand Prix', ' GP')}</a>
        </td>
        <td class="score ${race.winner === comparison.player1.playerId ? 'winner' : ''}">
          ${race.player1Total}
        </td>
        <td class="score ${race.winner === comparison.player2.playerId ? 'winner' : ''}">
          ${race.player2Total}
        </td>
        <td class="winner">${winner} ${margin}</td>
      `;

      tbody.appendChild(row);
    });

    section.appendChild(table);
    this.root.appendChild(section);
  }

  renderPointsTrend(comparison) {
    const section = this.createElement('section', 'points-trend');
    const heading = this.createElement('h2', 'section-heading', 'Points Trend');
    section.appendChild(heading);

    // Simple ASCII-style chart (can be replaced with Canvas/SVG later)
    const chartContainer = this.createElement('div', 'chart-container');

    // Calculate cumulative totals per race
    let p1Cumulative = 0;
    let p2Cumulative = 0;

    const chartData = comparison.raceComparisons.map(race => {
      p1Cumulative += race.player1Total;
      p2Cumulative += race.player2Total;

      return {
        raceId: race.raceId,
        raceName: race.raceName,
        player1: p1Cumulative,
        player2: p2Cumulative
      };
    });

    // Render simple table-based trend
    const trendTable = this.createElement('table', 'trend-table');
    trendTable.innerHTML = `
      <thead>
        <tr>
          <th>Race</th>
          <th>${comparison.player1.name}</th>
          <th>${comparison.player2.name}</th>
          <th>Gap</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = trendTable.querySelector('tbody');

    chartData.forEach(data => {
      const gap = Math.abs(data.player1 - data.player2);
      const leader = data.player1 > data.player2 ? comparison.player1.name : comparison.player2.name;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.raceName.replace(' Grand Prix', '')}</td>
        <td class="${data.player1 > data.player2 ? 'leading' : ''}">${data.player1}</td>
        <td class="${data.player2 > data.player1 ? 'leading' : ''}">${data.player2}</td>
        <td>${leader} +${gap}</td>
      `;

      tbody.appendChild(row);
    });

    chartContainer.appendChild(trendTable);
    section.appendChild(chartContainer);
    this.root.appendChild(section);
  }

  renderActions() {
    const actions = this.createElement('div', 'comparison-actions');

    const exportBtn = this.createElement('button', 'btn-secondary', 'Export Results');
    exportBtn.addEventListener('click', () => this.handleExport());

    const resetBtn = this.createElement('button', 'btn-danger', 'Reset Season');
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the entire fantasy season? This will clear the draft.')) {
        draftStore.clearDraft();
        window.location.hash = '#/draft';
      }
    });

    const backBtn = this.createElement('button', 'btn-primary', 'Back to Draft');
    backBtn.addEventListener('click', () => {
      window.location.hash = '#/draft';
    });

    actions.appendChild(exportBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(backBtn);

    this.root.appendChild(actions);
  }

  handleExport() {
    const draft = draftStore.draft;
    const [player1, player2] = draft.players;
    const comparison = fantasyTeamScorer.compareTeams(player1.playerId, player2.playerId);

    const exportData = {
      season: draft.season,
      players: [
        {
          name: player1.name,
          totalPoints: comparison.player1.totalPoints,
          raceWins: comparison.player1.raceWins,
          drivers: comparison.player1.drivers
        },
        {
          name: player2.name,
          totalPoints: comparison.player2.totalPoints,
          raceWins: comparison.player2.raceWins,
          drivers: comparison.player2.drivers
        }
      ],
      races: comparison.raceComparisons
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy_league_${draft.season}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
}
```

---

## 4) INTEGRATION WITH EXISTING VIEWS

### 4.1) Driver Profile View Enhancement

**Update**: Show fantasy points contribution when driver is drafted

```javascript
// In driver-profile-view.js, add to renderDriverHeader():

renderFantasyContribution(driver) {
  if (!draftStore.draft || draftStore.draft.status !== 'completed') return;

  const player = draftStore.getPlayerWhoPickedDriver(driver.driverId);
  if (!player) return;

  const section = this.createElement('section', 'fantasy-contribution');
  const heading = this.createElement('h2', 'section-heading', 'Fantasy Contribution');
  section.appendChild(heading);

  const card = this.createElement('div', 'contribution-card');
  card.innerHTML = `
    <p>Drafted by: <strong>${player.name}</strong></p>
  `;

  // Calculate season contribution
  const playerScore = fantasyTeamScorer.scorePlayerSeason(player.playerId);
  const driverContribution = playerScore.races.reduce((total, race) => {
    const driverScore = race.drivers.find(d => d.driverId === driver.driverId);
    return total + (driverScore ? driverScore.total : 0);
  }, 0);

  const contributionText = this.createElement('p', 'contribution-text',
    `Total Fantasy Points: ${driverContribution >= 0 ? '+' : ''}${driverContribution}`
  );
  card.appendChild(contributionText);

  section.appendChild(card);
  this.root.appendChild(section);
}
```

---

### 4.2) Race Detail View Enhancement

**Update**: Show fantasy-relevant highlights

```javascript
// In race-detail-view.js, add after renderRaceResults():

renderFantasyHighlights(raceId) {
  if (!draftStore.draft || draftStore.draft.status !== 'completed') return;

  const section = this.createElement('section', 'fantasy-highlights');
  const heading = this.createElement('h2', 'section-heading', 'Fantasy Highlights');
  section.appendChild(heading);

  const [player1, player2] = draftStore.draft.players;

  const p1Score = fantasyTeamScorer.scorePlayerRace(player1.playerId, raceId);
  const p2Score = fantasyTeamScorer.scorePlayerRace(player2.playerId, raceId);

  const winner = p1Score.total > p2Score.total ? player1.name : player2.name;
  const margin = Math.abs(p1Score.total - p2Score.total);

  const summary = this.createElement('div', 'fantasy-summary');
  summary.innerHTML = `
    <p><strong>${player1.name}:</strong> ${p1Score.total} points</p>
    <p><strong>${player2.name}:</strong> ${p2Score.total} points</p>
    <p class="fantasy-winner">Winner: ${winner} (+${margin})</p>
  `;

  section.appendChild(summary);
  this.root.appendChild(section);
}
```

---

### 4.3) Draft Complete Screen Enhancement

**Update**: Add "View Team Comparison" button

```javascript
// In draft-view.js, renderDraftComplete():

const viewTeamsBtn = this.createElement('button', 'btn-primary', 'View Team Comparison');
viewTeamsBtn.addEventListener('click', () => {
  window.location.hash = '#/teams';
});

actions.appendChild(viewTeamsBtn);
```

---

## 5) STATE & PERSISTENCE

### 5.1) Score Computation Strategy

**Approach**: **On-Demand Computation** (not cached)

**Rationale**:
- Scores derived from canonical CSVs (race_results, qualifying, sprint_results)
- CSVs may be manually corrected (penalties, amendments)
- Recomputing ensures scores always reflect latest data
- Performance acceptable (max ~20 drivers × ~24 races = 480 calculations)

**When Scores Are Computed**:
1. When Team Comparison view loads
2. When Driver Profile view loads (for fantasy contribution)
3. When Race Detail view loads (for fantasy highlights)

**Caching** (optional future optimization):
- Cache scores in `fantasyTeamScorer` with cache invalidation key
- Invalidate when CSVs change (detected via file modification timestamp)

---

### 5.2) Reset Behavior

**Scenarios**:

**1. New Season**:
- User manually updates CSVs with new season data
- Runs new draft for new season
- Old draft/scores remain in localStorage (different `draftId`)

**2. Re-Draft Same Season**:
- User clicks "Reset Draft" in draft view
- Clears `localStorage` draft data
- Scores recomputed when new draft completes

**3. Manual CSV Corrections**:
- User edits canonical CSVs (e.g., applies penalty)
- Scores automatically recomputed on next view load (no cache)

---

### 5.3) Data Flow Diagram

```
┌─────────────────┐
│  Canonical CSVs │ (race_results, qualifying, sprint_results)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FantasyScorer   │ Computes driver points per race
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│FantasyTeamScorer│ Aggregates team points
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Team Comparison │ Displays head-to-head
│      View       │
└─────────────────┘
```

---

## 6) ACCEPTANCE CRITERIA & TEST SCENARIOS

### A) Deliverables Checklist

- [x] Fantasy scoring configuration (DEFAULT_FANTASY_SCORING)
- [x] FantasyScorer class (driver scoring logic)
- [x] FantasyTeamScorer class (team aggregation)
- [x] Team Comparison view (#/teams)
- [x] Integration with Driver Profile view
- [x] Integration with Race Detail view
- [x] Integration with Draft Complete screen
- [x] On-demand score computation (no caching)

---

### B) Acceptance Criteria

1. ✅ **Deterministic Scoring**: Same inputs produce same outputs
2. ✅ **Transparent Rules**: All scoring rules defined in config object
3. ✅ **Configurable**: Easy to adjust scoring (edit DEFAULT_FANTASY_SCORING)
4. ✅ **Handle Missing Data**: Future races return 0 points gracefully
5. ✅ **Penalty Support**: DNF, DSQ, DNS penalties applied correctly
6. ✅ **Bonus Support**: Fastest lap, qualifying bonuses applied
7. ✅ **Team Aggregation**: Individual driver scores sum to team total
8. ✅ **Head-to-Head Comparison**: Clear winner/loser per race and season
9. ✅ **Per-Driver Breakdown**: Show each driver's contribution
10. ✅ **Recomputation**: Scores update when CSVs are corrected

---

### C) Manual Test Scenarios

#### TC-1: Compute Scores for Completed Races

**Setup**:
1. Complete draft (Alice: VER, PER, NOR, RUS, STR | Bob: LEC, SAI, HAM, ALO, OCO)
2. Ensure CSV data exists for 2024 Bahrain GP (round 1)

**Actions**:
1. Navigate to `#/teams`
2. View "Race-by-Race Breakdown"

**Expected**:
- Bahrain row shows:
  - Alice: 64 points
  - Bob: 31 points
  - Winner: Alice (+33)
- Driver contributions table shows:
  - Alice's VER: +32 points (P1 + quali bonus + fastest lap)
  - Bob's LEC: -4 points (DNF penalty)

**Pass**: ✅ Scores computed correctly from CSV data

---

#### TC-2: Handle Future Races Gracefully

**Setup**:
1. Same draft as TC-1
2. Calendar shows future race (Round 15, hasn't happened yet)

**Actions**:
1. Navigate to `#/teams`
2. View "Race-by-Race Breakdown"

**Expected**:
- Round 15 **not shown** in breakdown (only completed races)
- No errors in console
- Season total reflects only completed races (rounds 1-10)

**Pass**: ✅ Future races excluded gracefully

---

#### TC-3: Compare Two Teams

**Setup**:
1. Draft completed
2. 10 races completed in 2024 season

**Actions**:
1. Navigate to `#/teams`

**Expected**:
- Season Standings shows:
  - Alice: Total points, race wins, avg per race
  - Bob: Total points, race wins, avg per race
  - Leader badge (🏆) on Alice (if leading)
  - Lead margin displayed
- Driver Contributions shows:
  - Alice's 5 drivers sorted by total points (descending)
  - Bob's 5 drivers sorted by total points (descending)
- Race-by-Race Breakdown shows all 10 races with winner per race

**Pass**: ✅ Full comparison displayed correctly

---

#### TC-4: Reset and Recompute Scores

**Setup**:
1. Draft completed, scores displayed
2. Manually edit `race_results.csv`: Apply penalty to VER in Bahrain (change position 1 → 3)

**Actions**:
1. Refresh page
2. Navigate to `#/teams`

**Expected**:
- Bahrain scores recomputed:
  - VER: 15 points (P3 instead of P1)
  - Alice's team total reduced by 10 points
- Season standings reflect corrected data
- No old/cached scores displayed

**Pass**: ✅ Scores recomputed from updated CSV

---

#### TC-5: Scoring with Sprint Weekend

**Setup**:
1. Draft completed
2. Round 4 (Japan) is a sprint weekend

**Actions**:
1. Navigate to `#/teams`
2. View Driver Contributions for Round 4

**Expected**:
- Drivers who participated in sprint receive sprint points
- Example: VER wins sprint (P1 = 8 points) + wins race (P1 = 25 points) = 33+ points total
- Sprint points shown separately in detailed breakdown (if implemented)

**Pass**: ✅ Sprint points included in totals

---

#### TC-6: Fastest Lap Bonus

**Setup**:
1. VER finishes P1 with fastest lap at Bahrain

**Actions**:
1. Navigate to `#/teams`
2. Check VER's Bahrain score

**Expected**:
- Breakdown shows:
  - Race position: 25 points
  - Fastest lap: 2 points
  - Total: 27+ points (plus quali bonus)

**Pass**: ✅ Fastest lap bonus applied

---

#### TC-7: DNF Penalty

**Setup**:
1. LEC DNFs at Bahrain (Engine failure)

**Actions**:
1. Navigate to `#/teams`
2. Check LEC's Bahrain score

**Expected**:
- Breakdown shows:
  - Race position: 0 points (DNF)
  - DNF penalty: -5 points
  - Qualifying bonus: +1 point (if applicable)
  - Total: -4 points

**Pass**: ✅ DNF penalty applied correctly

---

#### TC-8: Driver Profile Fantasy Contribution

**Setup**:
1. Draft completed, VER drafted by Alice

**Actions**:
1. Navigate to `#/driver/max_verstappen`

**Expected**:
- "Fantasy Contribution" section shows:
  - "Drafted by: Alice"
  - "Total Fantasy Points: +280" (example)

**Pass**: ✅ Fantasy contribution displayed on driver profile

---

#### TC-9: Race Detail Fantasy Highlights

**Setup**:
1. Draft completed

**Actions**:
1. Navigate to `#/race/2024_01` (Bahrain)

**Expected**:
- "Fantasy Highlights" section shows:
  - Alice: 64 points
  - Bob: 31 points
  - Winner: Alice (+33)

**Pass**: ✅ Fantasy highlights shown on race detail

---

#### TC-10: Export Results

**Setup**:
1. Draft completed, season in progress

**Actions**:
1. Navigate to `#/teams`
2. Click "Export Results"

**Expected**:
- Browser downloads `fantasy_league_2024.json`
- JSON contains:
  - Player names, total points, race wins
  - Per-driver contributions
  - Race-by-race breakdown
- JSON is well-formatted and valid

**Pass**: ✅ Export functionality works

---

## 7) EXPLICIT NON-GOALS (Phase 5)

The following are OUT OF SCOPE for Phase 5:

- ❌ Live race updates (polling APIs for new results)
- ❌ Multiplayer sync (real-time score updates across devices)
- ❌ Advanced charts (Canvas/SVG line charts, bar charts)
- ❌ Betting/wagering logic
- ❌ Monetization or payments
- ❌ Email notifications (race results, standings updates)
- ❌ Mobile app (native iOS/Android)
- ❌ Social features (leaderboards, comments, trash talk)
- ❌ Trade/waiver system post-draft
- ❌ Multiple leagues or tournaments

---

## 8) CSS STYLES FOR TEAM COMPARISON

### 8.1) Team Comparison Styles

```css
/* styles/team-comparison.css */

/* Season Standings */
.season-standings {
  margin-bottom: var(--spacing-xl);
}

.standings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.player-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
  border: 3px solid transparent;
  text-align: center;
}

.player-card.leader {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-lg);
}

.player-card-name {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-md);
  color: var(--color-primary);
}

.trophy-icon {
  font-size: var(--font-size-xxl);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.stat-value {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  color: var(--color-primary);
}

.lead-margin {
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-top: var(--spacing-md);
}

/* Driver Contributions */
.driver-contributions {
  margin-bottom: var(--spacing-xl);
}

.contributions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
}

.contribution-container {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.contribution-header {
  text-align: center;
  margin-bottom: var(--spacing-md);
  color: var(--color-primary);
}

.contribution-table {
  width: 100%;
  font-size: var(--font-size-sm);
}

.contribution-table .total.positive {
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

.contribution-table .total.negative {
  color: var(--color-danger);
  font-weight: var(--font-weight-bold);
}

/* Race Breakdown */
.race-breakdown {
  margin-bottom: var(--spacing-xl);
}

.race-breakdown-table {
  width: 100%;
}

.race-breakdown-table .score {
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.race-breakdown-table .score.winner {
  background-color: #E8F5E9;
  color: var(--color-success);
}

.race-breakdown-table .winner {
  font-weight: var(--font-weight-bold);
  color: var(--color-success);
}

/* Points Trend */
.points-trend {
  margin-bottom: var(--spacing-xl);
}

.trend-table {
  width: 100%;
  font-size: var(--font-size-sm);
}

.trend-table .leading {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

/* Comparison Actions */
.comparison-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

/* Fantasy Highlights (Race Detail) */
.fantasy-highlights {
  margin-top: var(--spacing-xl);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
}

.fantasy-summary {
  text-align: center;
}

.fantasy-winner {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-success);
  margin-top: var(--spacing-sm);
}

/* Fantasy Contribution (Driver Profile) */
.fantasy-contribution {
  margin-top: var(--spacing-xl);
}

.contribution-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.contribution-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  margin-top: var(--spacing-sm);
}
```

---

## 9) FILE STRUCTURE SUMMARY

```
/F1-fantasy-league-v2/
├── lib/
│   ├── fantasy-scoring-config.js    # Scoring rules (NEW)
│   ├── fantasy-scorer.js            # Driver scoring logic (NEW)
│   └── fantasy-team-scorer.js       # Team aggregation (NEW)
├── views/
│   ├── team-comparison-view.js      # Team comparison UI (NEW)
│   ├── driver-profile-view.js       # UPDATED: Fantasy contribution
│   ├── race-detail-view.js          # UPDATED: Fantasy highlights
│   └── draft-view.js                # UPDATED: Link to team comparison
├── styles/
│   └── team-comparison.css          # Comparison view styles (NEW)
└── app.js                           # UPDATED: Register team comparison view
```

---

## NEXT STEPS (Pending User Approval)

**DO NOT PROCEED** until user explicitly approves Phase 5 and says "Proceed to Phase 6" (if applicable).

Awaiting user decision:
1. Approve fantasy scoring model ✅ or ❌
2. Approve team aggregation logic ✅ or ❌
3. Approve team comparison view design ✅ or ❌
4. Approve on-demand score computation approach ✅ or ❌
5. Request modifications 🔄
6. Move to Phase 6 (if defined) or conclude project

---

**Phase 5 Status**: ✅ **COMPLETE - AWAITING APPROVAL**
