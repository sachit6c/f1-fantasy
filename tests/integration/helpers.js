// tests/integration/helpers.js
// Shared helper to hydrate a real DataStore with test fixture data.

import { DataStore } from '../../lib/data-store.js';
import {
  SEASON,
  CSV_CONSTRUCTORS,
  CSV_DRIVERS,
  CSV_DRIVER_STANDINGS,
  CSV_CONSTRUCTOR_STANDINGS,
  CSV_RACES,
  CSV_RACE_RESULTS,
  CSV_QUALIFYING,
} from './fixtures.js';

/**
 * Creates a fully-populated DataStore from test fixtures.
 * Uses the real transformation and index-building code — no mocks.
 */
export function createTestDataStore() {
  const ds = new DataStore();
  ds.season = SEASON;

  // Run the real CSV transformation pipeline
  ds.data.constructors            = ds.transformCSVConstructors(CSV_CONSTRUCTORS);
  ds.data.drivers                 = ds.transformCSVDrivers(CSV_DRIVERS, CSV_DRIVER_STANDINGS);
  ds.data.raceResults             = ds.transformCSVRaceResults(CSV_RACE_RESULTS);
  ds.data.qualifying              = ds.transformCSVQualifying(CSV_QUALIFYING);
  ds.data.races                   = ds.transformCSVRaces(CSV_RACES, ds.data.raceResults);
  ds.data.driverSeasonSummary     = ds.transformCSVDriverStandings(CSV_DRIVER_STANDINGS);
  ds.data.constructorSeasonSummary = ds.transformCSVConstructorStandings(CSV_CONSTRUCTOR_STANDINGS);
  ds.data.driverCareerSummary     = [];

  // Build all O(1) lookup indexes
  ds.buildIndexes();
  ds.loaded = true;

  return ds;
}
