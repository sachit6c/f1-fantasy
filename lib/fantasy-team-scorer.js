// lib/fantasy-team-scorer.js
// Team-level scoring and comparison

export class FantasyTeamScorer {
  /**
   * Calculates a player's actual F1 points for a specific race.
   * @param {string} playerId - Player identifier
   * @param {string} raceId - Race identifier
   * @param {Object} draftStore - Draft store instance
   * @param {Object} dataStore - Data store instance
   * @returns {Object} - { total, drivers: [{ driverId, total }] }
   */
  scorePlayerRace(playerId, raceId, draftStore, dataStore) {
    const draft = draftStore.draft;
    if (!draft) return { total: 0, drivers: [] };

    const player = draft.players.find(p => p.playerId === playerId);
    if (!player) return { total: 0, drivers: [] };

    const results = dataStore.getRaceResults(raceId);
    const sprintResults = dataStore.getSprintResults(raceId);
    const drivers = player.roster.map(driverId => {
      const result = results.find(r => r.driverId === driverId);
      const sprintResult = sprintResults.find(r => r.driverId === driverId);
      const racePoints = result ? (parseFloat(result.points) || 0) : 0;
      const sprintPoints = sprintResult ? (parseFloat(sprintResult.points) || 0) : 0;
      const total = racePoints + sprintPoints;
      return { driverId, total };
    });

    const total = drivers.reduce((sum, d) => sum + d.total, 0);
    return { total, drivers };
  }

  /**
   * Calculates a player's total points across the season using official F1 standings.
   * Falls back to race-by-race calculation if standings are unavailable.
   * @param {string} playerId - Player identifier
   * @param {Object} draftStore - Draft store instance
   * @param {Object} dataStore - Data store instance
   * @returns {Object} - { total, drivers: [{ driverId, totalPoints }] }
   */
  scorePlayerSeason(playerId, draftStore, dataStore) {
    const draft = draftStore.draft;
    if (!draft) return { total: 0, races: [], drivers: [] };

    const season = draft.season || dataStore.season;
    const player = draft.players.find(p => p.playerId === playerId);
    if (!player) return { total: 0, races: [], drivers: [] };

    // Use official F1 standings points for each driver
    const drivers = player.roster.map(driverId => {
      const summary = dataStore.getDriverSeasonSummary(season, driverId);
      
      // Calculate podiums and fastest laps from race results
      const raceResults = dataStore.data.raceResults.filter(r => 
        r.driverId === driverId && r.season === season
      );
      
      const podiums = raceResults.filter(r => r.position <= 3).length;
      const fastestLaps = raceResults.filter(r => r.fastestLapRank === 1).length;
      
      return {
        driverId,
        totalPoints: summary ? summary.points : 0,
        position: summary ? summary.position : 99,
        wins: summary ? summary.wins : 0,
        podiums,
        fastestLaps
      };
    });

    const total = drivers.reduce((sum, d) => sum + d.totalPoints, 0);

    // Also build race-by-race data for the breakdown view
    const calendar = dataStore.getRacesBySeason(season);
    const races = calendar
      .filter(race => race.hasResults)
      .map(race => ({
        raceId: race.raceId,
        raceName: race.raceName,
        ...this.scorePlayerRace(playerId, race.raceId, draftStore, dataStore)
      }));

    return { total, races, drivers };
  }

  /**
   * Gets head-to-head comparison for two players.
   * @param {string} player1Id
   * @param {string} player2Id
   * @param {Object} draftStore
   * @param {Object} dataStore
   * @returns {Object} - Comparison data
   */
  compareTeams(player1Id, player2Id, draftStore, dataStore) {
    const player1Score = this.scorePlayerSeason(player1Id, draftStore, dataStore);
    const player2Score = this.scorePlayerSeason(player2Id, draftStore, dataStore);

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

    // Calculate per-driver contributions from official standings
    const player1DriverStats = player1Score.drivers;
    const player2DriverStats = player2Score.drivers;

    const season = draft.season || dataStore.season;

    // Calculate comprehensive aggregate stats for each team
    const calculateTeamStats = (roster) => {
      let wins = 0, podiums = 0, fastestLaps = 0, poles = 0, dnfs = 0, dns = 0;
      let q1Outs = 0, q2Outs = 0, q3Apps = 0;

      roster.forEach(driverId => {
        // Race results
        const raceResults = dataStore.data.raceResults.filter(r => 
          r.driverId === driverId && r.season === season
        );
        
        wins += raceResults.filter(r => r.position === 1).length;
        podiums += raceResults.filter(r => r.position <= 3).length;
        fastestLaps += raceResults.filter(r => r.fastestLapRank === 1).length;
        // "Lapped" means the driver finished but was lapped — it is NOT a DNF
        // DNS (Did not start / Withdrew) is tracked separately
        dnfs += raceResults.filter(r => r.status && r.status !== 'Finished' && r.status !== 'Lapped' && r.status !== 'Did not start' && r.status !== 'Withdrew').length;
        dns += raceResults.filter(r => r.status === 'Did not start' || r.status === 'Withdrew').length;

        // Qualifying results
        const qualifyingResults = dataStore.data.qualifying.filter(q => 
          q.driverId === driverId && q.season === season
        );
        
        poles += qualifyingResults.filter(q => q.position === 1).length;
        q1Outs += qualifyingResults.filter(q => !q.q2 && q.q1).length;
        q2Outs += qualifyingResults.filter(q => !q.q3 && q.q2).length;
        q3Apps += qualifyingResults.filter(q => q.q3).length;
      });

      return { wins, podiums, fastestLaps, poles, dnfs, dns, q1Outs, q2Outs, q3Apps };
    };

    const player1Stats = calculateTeamStats(player1.roster);
    const player2Stats = calculateTeamStats(player2.roster);

    // Calculate 1v1 driver matchups
    const driverMatchups = this.calculateDriverMatchups(
      player1.roster,
      player2.roster,
      dataStore,
      season
    );

    return {
      player1: {
        ...player1,
        totalPoints: player1Score.total,
        raceWins: player1Stats.wins,
        fantasyWins: player1Wins,
        podiums: player1Stats.podiums,
        fastestLaps: player1Stats.fastestLaps,
        poles: player1Stats.poles,
        dnfs: player1Stats.dnfs,
        dns: player1Stats.dns,
        q1Outs: player1Stats.q1Outs,
        q2Outs: player1Stats.q2Outs,
        q3Apps: player1Stats.q3Apps,
        races: player1Score.races,
        drivers: player1DriverStats
      },
      player2: {
        ...player2,
        totalPoints: player2Score.total,
        raceWins: player2Stats.wins,
        fantasyWins: player2Wins,
        podiums: player2Stats.podiums,
        fastestLaps: player2Stats.fastestLaps,
        poles: player2Stats.poles,
        dnfs: player2Stats.dnfs,
        dns: player2Stats.dns,
        q1Outs: player2Stats.q1Outs,
        q2Outs: player2Stats.q2Outs,
        q3Apps: player2Stats.q3Apps,
        races: player2Score.races,
        drivers: player2DriverStats
      },
      ties,
      raceComparisons,
      driverMatchups,
      leader: player1Score.total > player2Score.total ? player1Id : player2Id,
      margin: Math.abs(player1Score.total - player2Score.total)
    };
  }

  /**
   * Calculates head-to-head driver matchups for teammates only.
   * Only compares drivers from the same team picked by different players.
   * @param {Array<string>} roster1 - Player 1's driver IDs
   * @param {Array<string>} roster2 - Player 2's driver IDs
   * @param {Object} dataStore - Data store instance
   * @param {number} season - Season year
   * @returns {Object} - { player1Wins, player2Wins, ties, matchups: [] }
   */
  calculateDriverMatchups(roster1, roster2, dataStore, season) {
    let player1Wins = 0;
    let player2Wins = 0;
    let ties = 0;
    const matchups = [];

    // Find drivers from the same team (teammates)
    roster1.forEach(driver1Id => {
      const driver1 = dataStore.indexes.driverById.get(driver1Id);
      if (!driver1) return;

      roster2.forEach(driver2Id => {
        const driver2 = dataStore.indexes.driverById.get(driver2Id);
        if (!driver2) return;

        // Only compare teammates (same team)
        if (driver1.team !== driver2.team) return;

        const summary1 = dataStore.getDriverSeasonSummary(season, driver1Id);
        const summary2 = dataStore.getDriverSeasonSummary(season, driver2Id);
        
        const points1 = summary1 ? summary1.points : 0;
        const points2 = summary2 ? summary2.points : 0;
        const wins1 = summary1 ? summary1.wins : 0;
        const wins2 = summary2 ? summary2.wins : 0;

        // Get race results for both drivers
        const raceResults1 = dataStore.data.raceResults.filter(r => 
          r.driverId === driver1Id && r.season === season
        );
        const raceResults2 = dataStore.data.raceResults.filter(r => 
          r.driverId === driver2Id && r.season === season
        );

        // Calculate podiums and fastest laps from race results (convert strings to numbers)
        const podiums1 = raceResults1.filter(r => r.position <= 3).length;
        const podiums2 = raceResults2.filter(r => r.position <= 3).length;
        const fastestLaps1 = raceResults1.filter(r => r.fastestLapRank === 1).length;
        const fastestLaps2 = raceResults2.filter(r => r.fastestLapRank === 1).length;
        
        // "Lapped" means the driver finished but was lapped — it is NOT a DNF
        const dnfs1 = raceResults1.filter(r => r.status && r.status !== 'Finished' && r.status !== 'Lapped').length;
        const dnfs2 = raceResults2.filter(r => r.status && r.status !== 'Finished' && r.status !== 'Lapped').length;
        
        // Get qualifying results for poles and Q1/Q2/Q3 stats
        const qualifyingResults1 = dataStore.data.qualifying.filter(q => 
          q.driverId === driver1Id && q.season === season
        );
        const qualifyingResults2 = dataStore.data.qualifying.filter(q => 
          q.driverId === driver2Id && q.season === season
        );
        
        const poles1 = qualifyingResults1.filter(q => parseInt(q.position) === 1).length;
        const poles2 = qualifyingResults2.filter(q => parseInt(q.position) === 1).length;
        
        // Qualifying performance - Q1, Q2, Q3 eliminations
        const q1Outs1 = qualifyingResults1.filter(q => !q.q2 && q.q1).length;
        const q1Outs2 = qualifyingResults2.filter(q => !q.q2 && q.q1).length;
        const q2Outs1 = qualifyingResults1.filter(q => !q.q3 && q.q2).length;
        const q2Outs2 = qualifyingResults2.filter(q => !q.q3 && q.q2).length;
        const q3Apps1 = qualifyingResults1.filter(q => q.q3).length;
        const q3Apps2 = qualifyingResults2.filter(q => q.q3).length;
        
        // Calculate race-by-race beats (qualifying and race finishing)
        let driver1QualiBeats = 0;
        let driver2QualiBeats = 0;
        let driver1RaceBeats = 0;
        let driver2RaceBeats = 0;

        // Get all races for the season
        const races = dataStore.getRacesBySeason(season);
        
        races.forEach(race => {
          const result1 = raceResults1.find(r => r.raceId === race.raceId);
          const result2 = raceResults2.find(r => r.raceId === race.raceId);
          
          if (result1 && result2) {
            // Qualifying beats (lower grid position is better)
            if (result1.grid && result2.grid) {
              if (result1.grid < result2.grid) {
                driver1QualiBeats++;
              } else if (result2.grid < result1.grid) {
                driver2QualiBeats++;
              }
            }
            
            // Race finishing beats (lower position is better, 0 = DNF)
            const pos1 = result1.position || 999;
            const pos2 = result2.position || 999;
            if (pos1 < pos2) {
              driver1RaceBeats++;
            } else if (pos2 < pos1) {
              driver2RaceBeats++;
            }
          }
        });
        
        let result;
        if (points1 > points2) {
          player1Wins++;
          result = 'player1';
        } else if (points2 > points1) {
          player2Wins++;
          result = 'player2';
        } else {
          ties++;
          result = 'tie';
        }

        matchups.push({
          driver1Id,
          driver1Name: driver1.name,
          driver1Code: driver1.code,
          driver1Points: points1 || 0,
          driver1Wins: wins1 || 0,
          driver1Podiums: podiums1 || 0,
          driver1Poles: poles1 || 0,
          driver1FastestLaps: fastestLaps1 || 0,
          driver1DNFs: dnfs1 || 0,
          driver1Q3Apps: q3Apps1 || 0,
          driver1Q2Outs: q2Outs1 || 0,
          driver1Q1Outs: q1Outs1 || 0,
          driver1QualiBeats: driver1QualiBeats || 0,
          driver1RaceBeats: driver1RaceBeats || 0,
          driver2Id,
          driver2Name: driver2.name,
          driver2Code: driver2.code,
          driver2Points: points2 || 0,
          driver2Wins: wins2 || 0,
          driver2Podiums: podiums2 || 0,
          driver2Poles: poles2 || 0,
          driver2FastestLaps: fastestLaps2 || 0,
          driver2DNFs: dnfs2 || 0,
          driver2Q3Apps: q3Apps2 || 0,
          driver2Q2Outs: q2Outs2 || 0,
          driver2Q1Outs: q1Outs2 || 0,
          driver2QualiBeats: driver2QualiBeats || 0,
          driver2RaceBeats: driver2RaceBeats || 0,
          team: driver1.team,
          winner: result,
          margin: Math.abs(points1 - points2)
        });
      });
    });

    return { player1Wins, player2Wins, ties, matchups };
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
