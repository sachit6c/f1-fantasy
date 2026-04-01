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
   * Get all results for entire season (slow, use sparingly)
   */
  async getAllRaceResults(season) {
    const data = await this.fetch(`/${season}/results.json?limit=1000`);
    return data.MRData.RaceTable.Races || [];
  }

  /**
   * Get all qualifying results for entire season
   */
  async getAllQualifyingResults(season) {
    const data = await this.fetch(`/${season}/qualifying.json?limit=1000`);
    return data.MRData.RaceTable.Races || [];
  }

  /**
   * Get all sprint results for entire season
   */
  async getAllSprintResults(season) {
    const data = await this.fetch(`/${season}/sprint.json?limit=1000`);
    return data.MRData.RaceTable.Races || [];
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
