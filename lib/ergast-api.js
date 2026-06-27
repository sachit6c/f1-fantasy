// lib/ergast-api.js
// Jolpica F1 API client (Ergast continuation) for fetching real F1 data
// Using api.jolpi.ca as the active community fork of Ergast

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

export class ErgastAPI {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Generic fetch with caching
   */
  async fetch(endpoint) {
    const cacheKey = endpoint;
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      console.log(`[Ergast API] Cache hit: ${endpoint}`);
      return cached;
    }

    console.log(`[Ergast API] Fetching: ${endpoint}`);

    try {
      const response = await window.fetch(`${BASE_URL}${endpoint}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.saveToCache(cacheKey, data);

      return data;
    } catch (error) {
      console.error(`[Ergast API] Error fetching ${endpoint}:`, error);
      throw new Error(`Failed to fetch F1 data: ${error.message}`);
    }
  }

  /**
   * Get all races for a season
   */
  async getRaces(season) {
    const data = await this.fetch(`/${season}.json`);
    return data.MRData.RaceTable.Races || [];
  }

  /**
   * Get all drivers for a season
   */
  async getDrivers(season) {
    const data = await this.fetch(`/${season}/drivers.json?limit=100`);
    return data.MRData.DriverTable.Drivers || [];
  }

  /**
   * Get all constructors for a season
   */
  async getConstructors(season) {
    const data = await this.fetch(`/${season}/constructors.json`);
    return data.MRData.ConstructorTable.Constructors || [];
  }

  /**
   * Get driver standings for a season
   */
  async getDriverStandings(season) {
    const data = await this.fetch(`/${season}/driverStandings.json?limit=100`);
    const standings = data.MRData.StandingsTable.StandingsLists[0];
    return standings ? standings.DriverStandings : [];
  }

  /**
   * Get constructor standings for a season
   */
  async getConstructorStandings(season) {
    const data = await this.fetch(`/${season}/constructorStandings.json`);
    const standings = data.MRData.StandingsTable.StandingsLists[0];
    return standings ? standings.ConstructorStandings : [];
  }

  /**
   * Get race results for a specific race
   */
  async getRaceResults(season, round) {
    const data = await this.fetch(`/${season}/${round}/results.json`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0].Results : [];
  }

  /**
   * Get qualifying results for a specific race
   */
  async getQualifyingResults(season, round) {
    const data = await this.fetch(`/${season}/${round}/qualifying.json`);
    const races = data.MRData.RaceTable.Races;
    return races.length > 0 ? races[0].QualifyingResults : [];
  }

  /**
   * Fetches every page of a season-wide race endpoint and merges the results.
   *
   * Jolpica (like Ergast) silently caps `limit` at 100 rows per page and ignores
   * larger values, so a full season — which runs to hundreds of result rows —
   * must be paged through with `offset`. Requesting `?limit=1000` only ever
   * returns the first 100 rows (the earliest rounds); later races (and the
   * current one) silently fall off the end. A single race can also straddle a
   * page boundary, so races are merged by round and their nested result arrays
   * concatenated in finishing order.
   *
   * @param {string} basePath - endpoint without extension/query, e.g. `/2026/results`
   * @param {string} resultsKey - nested array key on each Race
   *        ('Results' | 'QualifyingResults' | 'SprintResults')
   * @returns {Promise<Array>} merged array of Race objects (one per round)
   */
  async fetchAllRacePages(basePath, resultsKey) {
    const PAGE_SIZE = 100;
    const racesByRound = new Map();
    const order = [];
    let offset = 0;
    let total = 0;

    do {
      const data = await this.fetch(`${basePath}.json?limit=${PAGE_SIZE}&offset=${offset}`);
      const mrData = data.MRData;
      total = parseInt(mrData.total, 10) || 0;
      const races = mrData.RaceTable.Races || [];

      for (const race of races) {
        const existing = racesByRound.get(race.round);
        if (existing) {
          existing[resultsKey] = (existing[resultsKey] || []).concat(race[resultsKey] || []);
        } else {
          racesByRound.set(race.round, { ...race, [resultsKey]: [...(race[resultsKey] || [])] });
          order.push(race.round);
        }
      }

      // Defensive: stop if a page comes back empty so a bad `total` can't loop forever.
      if (races.length === 0) break;

      offset += PAGE_SIZE;
    } while (offset < total);

    return order.map(round => racesByRound.get(round));
  }

  /**
   * Get all results for entire season (paginated — see fetchAllRacePages)
   */
  async getAllRaceResults(season) {
    return this.fetchAllRacePages(`/${season}/results`, 'Results');
  }

  /**
   * Get all qualifying results for entire season (paginated)
   */
  async getAllQualifyingResults(season) {
    return this.fetchAllRacePages(`/${season}/qualifying`, 'QualifyingResults');
  }

  /**
   * Get all sprint results for entire season (paginated)
   */
  async getAllSprintResults(season) {
    return this.fetchAllRacePages(`/${season}/sprint`, 'SprintResults');
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
export const ergastAPI = new ErgastAPI();
