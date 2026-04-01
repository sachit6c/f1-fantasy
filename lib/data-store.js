// lib/data-store.js
// Data store for F1 data

import { ergastAPI } from './ergast-api.js';
import { loadSeasonData } from './csv-loader.js';

export class DataStore {
  constructor() {
    this.season = 2026; // Default to 2026 (supported: 2025, 2026)
    this.data = {
      races: [],
      drivers: [],
      constructors: [],
      driverTeams: [],
      qualifying: [],
      raceResults: [],
      sprintResults: [],
      driverSeasonSummary: [],
      driverCareerSummary: [],
      constructorSeasonSummary: []
    };

    this.indexes = {
      raceById: new Map(),
      driverById: new Map(),
      constructorById: new Map(),
      circuitById: new Map(),
      resultsByRace: new Map(),
      sprintResultsByRace: new Map(),
      qualifyingByRace: new Map(),
      driverSeasonSummaryIndex: new Map(),
      racesBySeason: new Map()
    };

    this.loaded = false;
  }

  setSeason(season) {
    const s = parseInt(season);
    // Only force reload if season actually changed
    if (this.season !== s) {
      this.season = s;
      this.loaded = false; // Force reload when season changes
    }
  }

  async load() {
    console.log(`[DataStore] Loading F1 data for ${this.season} season...`);

    try {
      // Try loading from CSV first (offline mode)
      try {
        console.log('[DataStore] 📁 Attempting to load from CSV files...');
        const csvData = await loadSeasonData(this.season);

        console.log(`[DataStore] ✓ Got ${csvData.drivers.length} drivers from CSV`);
        console.log(`[DataStore] ✓ Got ${csvData.constructors.length} constructors from CSV`);
        console.log(`[DataStore] ✓ Got ${csvData.races.length} races from CSV`);

        // Transform CSV data to app data model
        console.log('[DataStore] Transforming CSV data...');
        this.data.constructors = this.transformCSVConstructors(csvData.constructors);
        this.data.drivers = this.transformCSVDrivers(csvData.drivers, csvData.driverStandings);
        this.data.raceResults = this.transformCSVRaceResults(csvData.raceResults || []);
        this.data.sprintResults = this.transformCSVRaceResults(csvData.sprintResults || []);
        this.data.qualifying = this.transformCSVQualifying(csvData.qualifying || []);
        this.data.races = this.transformCSVRaces(csvData.races, this.data.raceResults);
        this.data.driverSeasonSummary = this.transformCSVDriverStandings(csvData.driverStandings);
        this.data.constructorSeasonSummary = this.transformCSVConstructorStandings(csvData.constructorStandings);

        // Leave driver career summary empty (not in CSV)
        this.data.driverCareerSummary = [];

        // Build indexes
        this.buildIndexes();

        this.loaded = true;
        console.log(`[DataStore] ✅ Successfully loaded ${this.data.drivers.length} drivers, ${this.data.races.length} races for ${this.season} (from CSV)`);

        // Fire auto-refresh in background — isolated so it CANNOT trigger the API fallback
        try { this.autoRefreshIfNeeded(); } catch (e) { /* ignore */ }

        return true;

      } catch (csvError) {
        console.warn('[DataStore] ⚠️ CSV files not found, falling back to API...', csvError.message);

        // Fall back to API if CSV not available
        console.log('[DataStore] 🌐 Fetching from Jolpica API...');
        const apiDrivers = await ergastAPI.getDrivers(this.season);
        console.log(`[DataStore] ✓ Got ${apiDrivers.length} drivers from API`);

        const apiConstructors = await ergastAPI.getConstructors(this.season);
        console.log(`[DataStore] ✓ Got ${apiConstructors.length} constructors from API`);

        const apiRaces = await ergastAPI.getRaces(this.season);
        console.log(`[DataStore] ✓ Got ${apiRaces.length} races from API`);

        const apiDriverStandings = await ergastAPI.getDriverStandings(this.season);
        console.log(`[DataStore] ✓ Got ${apiDriverStandings.length} driver standings from API`);

        const apiConstructorStandings = await ergastAPI.getConstructorStandings(this.season);
        console.log(`[DataStore] ✓ Got ${apiConstructorStandings.length} constructor standings from API`);

        // Transform API data to app data model
        console.log('[DataStore] Transforming API data...');
        this.data.constructors = this.transformConstructors(apiConstructors);
        this.data.drivers = this.transformDrivers(apiDrivers, apiDriverStandings);
        this.data.races = this.transformRaces(apiRaces);
        this.data.driverSeasonSummary = this.transformDriverStandings(apiDriverStandings);
        this.data.constructorSeasonSummary = this.transformConstructorStandings(apiConstructorStandings);

        // For now, leave qualifying and race results empty (load on-demand in future)
        this.data.qualifying = [];
        this.data.raceResults = [];
        this.data.driverCareerSummary = [];

        // Build indexes
        this.buildIndexes();

        this.loaded = true;
        console.log(`[DataStore] ✅ Successfully loaded ${this.data.drivers.length} drivers, ${this.data.races.length} races for ${this.season} (from API)`);
        return true;
      }
    } catch (error) {
      console.error('[DataStore] ❌ Failed to load F1 data:', error);
      console.error('[DataStore] Error stack:', error.stack);
      throw new Error(`Failed to load F1 data for ${this.season}: ${error.message}`);
    }
  }

  buildIndexes() {
    // Build lookup indexes for fast access
    this.indexes.driverById.clear();
    this.indexes.raceById.clear();
    this.indexes.constructorById.clear();
    this.indexes.racesBySeason.clear();
    this.indexes.resultsByRace.clear();
    this.indexes.qualifyingByRace.clear();

    this.data.drivers.forEach(driver => {
      this.indexes.driverById.set(driver.driverId, driver);
    });

    this.data.races.forEach(race => {
      this.indexes.raceById.set(race.raceId, race);
      if (!this.indexes.racesBySeason.has(race.season)) {
        this.indexes.racesBySeason.set(race.season, []);
      }
      this.indexes.racesBySeason.get(race.season).push(race);
    });

    this.data.constructors.forEach(constructor => {
      this.indexes.constructorById.set(constructor.constructorId, constructor);
    });

    this.data.driverSeasonSummary.forEach(summary => {
      const key = `${summary.season}_${summary.driverId}`;
      this.indexes.driverSeasonSummaryIndex.set(key, summary);
    });

    // Index race results by raceId
    this.data.raceResults.forEach(result => {
      const raceId = result.raceId; // Use raceId from result object
      if (!this.indexes.resultsByRace.has(raceId)) {
        this.indexes.resultsByRace.set(raceId, []);
      }
      this.indexes.resultsByRace.get(raceId).push(result);
    });

    // Index sprint results by raceId
    this.indexes.sprintResultsByRace.clear();
    this.data.sprintResults.forEach(result => {
      const raceId = result.raceId;
      if (!this.indexes.sprintResultsByRace.has(raceId)) {
        this.indexes.sprintResultsByRace.set(raceId, []);
      }
      this.indexes.sprintResultsByRace.get(raceId).push(result);
    });

    // Index qualifying results by raceId
    this.data.qualifying.forEach(result => {
      const raceId = result.raceId;
      if (!this.indexes.qualifyingByRace.has(raceId)) {
        this.indexes.qualifyingByRace.set(raceId, []);
      }
      this.indexes.qualifyingByRace.get(raceId).push(result);
    });
  }

  /**
   * Gets the local file path for a driver photo
   * @param {string} driverId - Driver ID (e.g. "max_verstappen")
   * @returns {string} relative URL path to image file
   * Note: Actual format may be .jpg, .png, or .svg - use onerror to fallback
   */
  getDriverImageUrl(driverId) {
    return `data/images/drivers/${driverId}.jpg`;
  }

  /**
   * Gets the local file path for a constructor logo
   * @param {string} constructorId - Constructor ID (e.g. "red_bull")
   * @returns {string} relative URL path to image file
   * Note: Actual format may be .jpg, .png, or .svg - use onerror to fallback
   */
  getConstructorLogoUrl(constructorId) {
    return `data/images/constructors/${constructorId}.png`;
  }

  /**
   * Get constructor logo with fallback support for different formats
   */
  getConstructorLogoWithFallback(constructorId) {
    return {
      primary: `data/images/constructors/${constructorId}.png`,
      fallback1: `data/images/constructors/${constructorId}.jpg`,
      fallback2: `data/images/constructors/${constructorId}.svg`
    };
  }

  /**
   * Get driver image with fallback support for different formats
   */
  getDriverImageWithFallback(driverId) {
    return {
      primary: `data/images/drivers/${driverId}.jpg`,
      fallback1: `data/images/drivers/${driverId}.png`,
      fallback2: `data/images/drivers/${driverId}.svg`
    };
  }

  transformConstructors(apiConstructors) {
    const teamColors = this.getTeamColors();

    return apiConstructors.map(constructor => {
      const teamColor = teamColors[constructor.constructorId] || '#999999';
      return {
        constructorId: constructor.constructorId,
        name: constructor.name,
        nationality: constructor.nationality,
        teamColor: teamColor,
        logoUrl: this.getConstructorLogoUrl(constructor.constructorId)
      };
    });
  }

  transformDrivers(apiDrivers, apiDriverStandings) {
    const teamColors = this.getTeamColors();

    // Build a map of driver to constructor from standings
    const driverConstructorMap = new Map();
    if (apiDriverStandings && apiDriverStandings.length > 0) {
      apiDriverStandings.forEach(standing => {
        const constructors = standing.Constructors;
        if (constructors && constructors.length > 0) {
          const constructorId = constructors[0].constructorId;
          driverConstructorMap.set(standing.Driver.driverId, {
            constructorId,
            constructorName: constructors[0].name
          });
        }
      });
    }

    // Only include drivers who have standings (actually raced)
    // This filters out reserve/test drivers who never participated
    return apiDrivers
      .filter(driver => driverConstructorMap.has(driver.driverId))
      .map(driver => {
        const teamInfo = driverConstructorMap.get(driver.driverId);
        const teamName = teamInfo.constructorName;
        const teamColor = teamColors[teamInfo.constructorId] || '#999999';

        const code = driver.code || `${driver.givenName[0]}${driver.familyName[0]}`;

        return {
          driverId: driver.driverId,
          code: code,
          number: parseInt(driver.permanentNumber) || null,
          name: `${driver.givenName} ${driver.familyName}`,
          nationality: driver.nationality || 'Unknown',
          team: teamName,
          teamColor: teamColor,
          photoUrl: this.getDriverImageUrl(driver.driverId)
        };
      });
  }

  transformRaces(apiRaces) {
    return apiRaces.map(race => ({
      raceId: `${race.Circuit.circuitId}_${race.round}`,
      round: parseInt(race.round),
      raceName: race.raceName,
      date: race.date,
      season: parseInt(race.season),
      circuitName: race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      lat: race.Circuit.Location.lat,
      long: race.Circuit.Location.long
    }));
  }

  transformDriverStandings(apiDriverStandings) {
    if (!apiDriverStandings || apiDriverStandings.length === 0) return [];

    return apiDriverStandings.map(standing => ({
      season: this.season,
      driverId: standing.Driver.driverId,
      constructorId: standing.Constructors && standing.Constructors.length > 0 
        ? standing.Constructors[0].constructorId 
        : null,
      position: parseInt(standing.position),
      points: parseFloat(standing.points),
      wins: parseInt(standing.wins),
      secondPlaces: 0, // Not available in API
      thirdPlaces: 0   // Not available in API
    }));
  }

  transformConstructorStandings(apiConstructorStandings) {
    if (!apiConstructorStandings || apiConstructorStandings.length === 0) return [];

    return apiConstructorStandings.map(standing => ({
      season: this.season,
      constructorId: standing.Constructor.constructorId,
      position: parseInt(standing.position),
      points: parseFloat(standing.points),
      wins: parseInt(standing.wins),
      podiums: 0 // Not directly available
    }));
  }

  getTeamColors() {
    // F1 team colors mapping - updated for 2025/2026
    return {
      'red_bull': '#3671C6',
      'ferrari': '#E8002D',
      'mercedes': '#27F4D2',
      'mclaren': '#FF8000',
      'aston_martin': '#229971',
      'alpine': '#FF87BC',
      'haas': '#B6BABD',
      'alphatauri': '#6692FF',
      'rb': '#6692FF',
      'williams': '#64C4FF',
      'alfa': '#C92D4B',
      'sauber': '#52E252',
      'kick_sauber': '#52E252',
      'audi': '#E00400',
      'cadillac': '#FFD700'
    };
  }

  // CSV Transformation Methods
  // These transform CSV row objects to app data model

  transformCSVConstructors(csvConstructors) {
    const teamColors = this.getTeamColors();

    return csvConstructors.map(constructor => {
      const name = this.getConstructorName(constructor.constructorId);
      const teamColor = teamColors[constructor.constructorId] || '#999999';
      return {
        constructorId: constructor.constructorId,
        name: name,
        nationality: constructor.nationality,
        teamColor: teamColor,
        logoUrl: this.getConstructorLogoUrl(constructor.constructorId)
      };
    });
  }

  transformCSVDrivers(csvDrivers, csvDriverStandings) {
    const teamColors = this.getTeamColors();

    // Build a map of driver to constructor from standings
    const driverConstructorMap = new Map();
    if (csvDriverStandings && csvDriverStandings.length > 0) {
      csvDriverStandings.forEach(standing => {
        if (standing.constructorId) {
          driverConstructorMap.set(standing.driverId, standing.constructorId);
        }
      });
    }

    // Only include drivers who have standings (actually raced)
    // This filters out reserve/test drivers who never participated
    return csvDrivers
      .filter(driver => driverConstructorMap.has(driver.driverId))
      .map(driver => {
        const constructorId = driverConstructorMap.get(driver.driverId);
        const teamName = this.getConstructorName(constructorId);
        const teamColor = teamColors[constructorId] || '#999999';

        const code = driver.code || `${driver.givenName?.[0] || ''}${driver.familyName?.[0] || ''}`;

        return {
          driverId: driver.driverId,
          code: code,
          number: driver.permanentNumber ? parseInt(driver.permanentNumber) : null,
          name: `${driver.givenName} ${driver.familyName}`.trim(),
          nationality: driver.nationality || 'Unknown',
          team: teamName,
          teamColor: teamColor,
          constructorId: constructorId,
          photoUrl: this.getDriverImageUrl(driver.driverId)
        };
      });
  }

  transformCSVRaces(csvRaces, raceResults) {
    // Build a set of rounds that have results
    const roundsWithResults = new Set();
    if (raceResults && raceResults.length > 0) {
      raceResults.forEach(result => {
        roundsWithResults.add(parseInt(result.round));
      });
    }

    return csvRaces.map(race => ({
      raceId: `${race.season}_${String(race.round).padStart(2, '0')}`,
      round: parseInt(race.round),
      raceName: race.raceName || 'Grand Prix',
      date: race.date,
      time: race.time || null,
      season: parseInt(race.season),
      circuitId: race.circuitId,
      circuitName: race.circuitName,
      locality: race.locality,
      country: race.country,
      lat: race.lat,
      long: race.long,
      hasResults: roundsWithResults.has(parseInt(race.round))
    }));
  }

  transformCSVRaceResults(csvRaceResults) {
    if (!csvRaceResults || csvRaceResults.length === 0) return [];

    return csvRaceResults.map(result => ({
      raceId: `${result.season}_${String(result.round).padStart(2, '0')}`,
      season: parseInt(result.season),
      round: parseInt(result.round),
      circuitId: result.circuitId,
      driverId: result.driverId,
      position: parseInt(result.position),
      grid: parseInt(result.grid),
      points: parseFloat(result.points),
      laps: parseInt(result.laps),
      status: result.status || 'Unknown',
      fastestLapRank: result.fastestLapRank ? parseInt(result.fastestLapRank) : null
    }));
  }

  transformCSVQualifying(csvQualifying) {
    if (!csvQualifying || csvQualifying.length === 0) return [];

    return csvQualifying.map(result => ({
      raceId: result.raceId,
      season: parseInt(result.season),
      round: parseInt(result.round),
      circuitId: result.circuitId,
      driverId: result.driverId,
      position: parseInt(result.position),
      q1: result.q1 || null,
      q2: result.q2 || null,
      q3: result.q3 || null
    }));
  }

  transformCSVDriverStandings(csvDriverStandings) {
    if (!csvDriverStandings || csvDriverStandings.length === 0) return [];

    return csvDriverStandings.map(standing => {
      const pos = parseInt(standing.position);
      return {
        season: parseInt(standing.season),
        driverId: standing.driverId,
        constructorId: standing.constructorId,
        position: isNaN(pos) ? null : pos,
        points: parseFloat(standing.points) || 0,
        wins: parseInt(standing.wins) || 0,
        secondPlaces: 0, // Not available in CSV
        thirdPlaces: 0   // Not available in CSV
      };
    });
  }

  transformCSVConstructorStandings(csvConstructorStandings) {
    if (!csvConstructorStandings || csvConstructorStandings.length === 0) return [];

    return csvConstructorStandings.map(standing => {
      const pos = parseInt(standing.position);
      return {
        season: parseInt(standing.season),
        constructorId: standing.constructorId,
        position: isNaN(pos) ? null : pos,
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        podiums: 0 // Not directly available
      };
    });
  }

  // Helper method to get constructor name from ID
  getConstructorName(constructorId) {
    const names = {
      'red_bull': 'Red Bull Racing',
      'ferrari': 'Ferrari',
      'mercedes': 'Mercedes',
      'mclaren': 'McLaren',
      'aston_martin': 'Aston Martin',
      'alpine': 'Alpine',
      'haas': 'Haas',
      'alphatauri': 'AlphaTauri',
      'rb': 'RB',
      'williams': 'Williams',
      'alfa': 'Alfa Romeo',
      'sauber': 'Sauber',
      'kick_sauber': 'Kick Sauber',
      'audi': 'Audi',
      'cadillac': 'Cadillac'
    };
    return names[constructorId] || constructorId;
  }

  getRace(raceId) {
    return this.indexes.raceById.get(raceId) || null;
  }

  getRacesBySeason(season) {
    return this.indexes.racesBySeason.get(season) || [];
  }

  getRaceResults(raceId) {
    return this.indexes.resultsByRace.get(raceId) || [];
  }

  getSprintResults(raceId) {
    return this.indexes.sprintResultsByRace.get(raceId) || [];
  }

  getQualifying(raceId) {
    return this.indexes.qualifyingByRace.get(raceId) || [];
  }

  getDriverSeasonSummary(season, driverId) {
    const key = `${season}_${driverId}`;
    return this.indexes.driverSeasonSummaryIndex.get(key) || null;
  }

  /**
   * Gets all drivers grouped by team.
   * @returns {Map<string, Array>} - Map of team name to array of drivers
   */
  getDriversByTeam() {
    const byTeam = new Map();
    this.data.drivers.forEach(driver => {
      if (!byTeam.has(driver.team)) {
        byTeam.set(driver.team, []);
      }
      byTeam.get(driver.team).push(driver);
    });
    return byTeam;
  }

  /**
   * Gets a driver's teammate.
   * @param {string} driverId - Driver ID
   * @returns {Object|null} - Teammate driver object or null
   */
  getTeammate(driverId) {
    const driver = this.indexes.driverById.get(driverId);
    if (!driver) return null;

    const teammate = this.data.drivers.find(d =>
      d.team === driver.team && d.driverId !== driverId
    );

    return teammate || null;
  }

  /**
   * Gets all of a driver's teammates (for teams with 3+ drivers).
   * @param {string} driverId - Driver ID
   * @returns {Array<Object>} - Array of teammate driver objects
   */
  getTeammates(driverId) {
    const driver = this.indexes.driverById.get(driverId);
    if (!driver) return [];

    const teammates = this.data.drivers.filter(d =>
      d.team === driver.team && d.driverId !== driverId
    );

    return teammates;
  }

  /**
   * Gets all unique team names.
   * @returns {Array<string>}
   */
  getTeams() {
    const teams = new Set(this.data.drivers.map(d => d.team));
    return Array.from(teams);
  }

  /**
   * Gets the number of teams (used for calculating roster size).
   * @returns {number}
   */
  getTeamCount() {
    return this.getTeams().length;
  }

  /**
   * Fetches the latest qualifying, race results, and standings directly
   * from the Jolpica API and updates the in-memory store.
   * Does NOT write to CSV files — reload the page after this to persist via CSV.
   * @returns {Promise<{rounds:number, raceResults:number, qualifying:number}>}
   */
  async refreshLiveData() {
    const season = this.season;
    console.log(`[DataStore] 🔄 Live refresh for ${season}...`);

    // Bust the API cache so we always get the very latest data
    ergastAPI.clearCache();

    // Fetch qualifying, race results, sprint results, and both standings in parallel
    const [raceRounds, qualRounds, sprintRounds, apiDriverStandings, apiConstructorStandings] =
      await Promise.all([
        ergastAPI.getAllRaceResults(season),
        ergastAPI.getAllQualifyingResults(season),
        ergastAPI.getAllSprintResults(season).catch(() => []),
        ergastAPI.getDriverStandings(season).catch(() => []),
        ergastAPI.getConstructorStandings(season).catch(() => []),
      ]);

    // Convert API race-results format → CSV-row-like format so the
    // existing transformCSVRaceResults() can be reused directly.
    const raceResultRows = [];
    raceRounds.forEach(race => {
      const rnd = race.round;
      const circuitId = race.Circuit.circuitId;
      (race.Results || []).forEach(r => {
        raceResultRows.push({
          season: String(season),
          round: rnd,
          circuitId,
          driverId: r.Driver.driverId,
          constructorId: r.Constructor?.constructorId || '',
          position: r.position || '',
          grid: r.grid || '',
          points: r.points || '0',
          laps: r.laps || '',
          status: r.status || '',
          fastestLapRank: r.FastestLap?.rank || '',
        });
      });
    });

    // Convert API qualifying format → CSV-row-like format
    const qualRows = [];
    qualRounds.forEach(race => {
      const rnd = race.round;
      const circuitId = race.Circuit.circuitId;
      const raceId = `${season}_${String(rnd).padStart(2, '0')}`;
      (race.QualifyingResults || []).forEach(r => {
        qualRows.push({
          raceId,
          season: String(season),
          round: rnd,
          circuitId,
          driverId: r.Driver.driverId,
          constructorId: r.Constructor?.constructorId || '',
          position: r.position || '',
          q1: r.Q1 || '',
          q2: r.Q2 || '',
          q3: r.Q3 || '',
        });
      });
    });

    // Convert API sprint results format → CSV-row-like format (same shape as race results)
    const sprintResultRows = [];
    sprintRounds.forEach(race => {
      const rnd = race.round;
      const circuitId = race.Circuit.circuitId;
      (race.SprintResults || []).forEach(r => {
        sprintResultRows.push({
          season: String(season),
          round: rnd,
          circuitId,
          driverId: r.Driver.driverId,
          constructorId: r.Constructor?.constructorId || '',
          position: r.position || '',
          grid: r.grid || '',
          points: r.points || '0',
          laps: r.laps || '',
          status: r.status || '',
          fastestLapRank: r.FastestLap?.rank || '',
        });
      });
    });

    // Update in-memory data
    this.data.raceResults = this.transformCSVRaceResults(raceResultRows);
    this.data.sprintResults = this.transformCSVRaceResults(sprintResultRows);
    this.data.qualifying  = this.transformCSVQualifying(qualRows);
    if (apiDriverStandings.length)     this.data.driverSeasonSummary      = this.transformDriverStandings(apiDriverStandings);
    if (apiConstructorStandings.length) this.data.constructorSeasonSummary = this.transformConstructorStandings(apiConstructorStandings);

    // Refresh hasResults flag on each race
    const roundsWithResults = new Set(this.data.raceResults.map(r => r.round));
    this.data.races = this.data.races.map(race => ({
      ...race,
      hasResults: roundsWithResults.has(race.round),
    }));

    // Rebuild all indexes
    this.buildIndexes();

    const summary = {
      rounds: raceRounds.length,
      raceResults: raceResultRows.length,
      sprintResults: sprintResultRows.length,
      qualifying: qualRows.length,
    };
    console.log('[DataStore] ✅ Live refresh complete:', summary);
    return summary;
  }

  /**
   * Auto-refreshes live data if any race that should have results (date ≤ today)
   * is missing results in the loaded CSV data.
   * Safe to call fire-and-forget after initial CSV load.
   */
  async autoRefreshIfNeeded() {
    if (!this.loaded) return;

    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const missingResults = this.data.races.filter(
      r => r.season === this.season && r.date <= todayStr && !r.hasResults
    );

    if (missingResults.length > 0) {
      const names = missingResults.map(r => r.raceName).join(', ');
      console.log(`[DataStore] 🔄 Auto-refresh: found ${missingResults.length} past race(s) without results (${names})`);
      try {
        await this.refreshLiveData();
        console.log('[DataStore] ✅ Auto-refresh complete');
        window.dispatchEvent(new CustomEvent('datastore:refreshed'));
      } catch (err) {
        console.warn('[DataStore] ⚠️ Auto-refresh failed:', err.message);
      }
    }
  }
}

// Singleton instance
export const dataStore = new DataStore();
