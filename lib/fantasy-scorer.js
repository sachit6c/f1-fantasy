// lib/fantasy-scorer.js
// Fantasy scoring engine for individual drivers

import { DEFAULT_FANTASY_SCORING } from './fantasy-scoring-config.js';

export class FantasyScorer {
  constructor(config = DEFAULT_FANTASY_SCORING) {
    this.config = config;
  }

  /**
   * Calculates fantasy points for a driver in a specific race.
   * @param {string} raceId - Race identifier
   * @param {string} driverId - Driver identifier
   * @param {Object} dataStore - Data store instance
   * @returns {Object} - { total, breakdown, participated }
   */
  scoreDriverRace(raceId, driverId, dataStore) {
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
      if (driverResult.fastestLapRank === 1 || driverResult.fastestLapRank === '1') {
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
      const beatTeammate = this.checkBeatTeammate(raceId, driverId, driverResult, dataStore);
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
   * @param {Object} dataStore
   * @returns {boolean}
   */
  checkBeatTeammate(raceId, driverId, driverResult, dataStore) {
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
   * @param {Object} dataStore
   * @returns {Array<Object>} - [{ driverId, total, breakdown, participated }]
   */
  scoreRace(raceId, dataStore) {
    const results = dataStore.getRaceResults(raceId);

    return results.map(r => ({
      driverId: r.driverId,
      ...this.scoreDriverRace(raceId, r.driverId, dataStore)
    }));
  }
}

// Singleton instance
export const fantasyScorer = new FantasyScorer();
