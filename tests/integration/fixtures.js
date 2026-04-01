// tests/integration/fixtures.js
// Shared realistic F1 test data for integration tests.
// Models a mini 2026 season with 5 teams, 10 drivers, and 3 races.

export const SEASON = 2026;

// ─── Constructors ────────────────────────────────────────────────────────────

export const CSV_CONSTRUCTORS = [
  { constructorId: 'red_bull',      nationality: 'Austrian' },
  { constructorId: 'ferrari',       nationality: 'Italian' },
  { constructorId: 'mclaren',       nationality: 'British' },
  { constructorId: 'mercedes',      nationality: 'German' },
  { constructorId: 'aston_martin',  nationality: 'British' },
];

// ─── Drivers ─────────────────────────────────────────────────────────────────

export const CSV_DRIVERS = [
  { driverId: 'max_verstappen',    permanentNumber: '1',  code: 'VER', givenName: 'Max',      familyName: 'Verstappen',  nationality: 'Dutch' },
  { driverId: 'sergio_perez',      permanentNumber: '11', code: 'PER', givenName: 'Sergio',   familyName: 'Perez',       nationality: 'Mexican' },
  { driverId: 'charles_leclerc',   permanentNumber: '16', code: 'LEC', givenName: 'Charles',  familyName: 'Leclerc',     nationality: 'Monegasque' },
  { driverId: 'carlos_sainz',      permanentNumber: '55', code: 'SAI', givenName: 'Carlos',   familyName: 'Sainz',       nationality: 'Spanish' },
  { driverId: 'lando_norris',      permanentNumber: '4',  code: 'NOR', givenName: 'Lando',    familyName: 'Norris',      nationality: 'British' },
  { driverId: 'oscar_piastri',     permanentNumber: '81', code: 'PIA', givenName: 'Oscar',    familyName: 'Piastri',     nationality: 'Australian' },
  { driverId: 'lewis_hamilton',     permanentNumber: '44', code: 'HAM', givenName: 'Lewis',    familyName: 'Hamilton',    nationality: 'British' },
  { driverId: 'george_russell',    permanentNumber: '63', code: 'RUS', givenName: 'George',   familyName: 'Russell',     nationality: 'British' },
  { driverId: 'fernando_alonso',   permanentNumber: '14', code: 'ALO', givenName: 'Fernando', familyName: 'Alonso',      nationality: 'Spanish' },
  { driverId: 'lance_stroll',      permanentNumber: '18', code: 'STR', givenName: 'Lance',    familyName: 'Stroll',      nationality: 'Canadian' },
];

// ─── Driver standings (maps drivers to constructors) ─────────────────────────

export const CSV_DRIVER_STANDINGS = [
  { season: '2026', driverId: 'max_verstappen',  constructorId: 'red_bull',     position: '1',  points: '200', wins: '5' },
  { season: '2026', driverId: 'charles_leclerc',  constructorId: 'ferrari',      position: '2',  points: '170', wins: '3' },
  { season: '2026', driverId: 'lando_norris',     constructorId: 'mclaren',      position: '3',  points: '150', wins: '2' },
  { season: '2026', driverId: 'lewis_hamilton',    constructorId: 'mercedes',     position: '4',  points: '120', wins: '1' },
  { season: '2026', driverId: 'oscar_piastri',    constructorId: 'mclaren',      position: '5',  points: '100', wins: '1' },
  { season: '2026', driverId: 'carlos_sainz',     constructorId: 'ferrari',      position: '6',  points: '90',  wins: '0' },
  { season: '2026', driverId: 'george_russell',   constructorId: 'mercedes',     position: '7',  points: '80',  wins: '0' },
  { season: '2026', driverId: 'sergio_perez',     constructorId: 'red_bull',     position: '8',  points: '60',  wins: '0' },
  { season: '2026', driverId: 'fernando_alonso',  constructorId: 'aston_martin', position: '9',  points: '40',  wins: '0' },
  { season: '2026', driverId: 'lance_stroll',     constructorId: 'aston_martin', position: '10', points: '20',  wins: '0' },
];

export const CSV_CONSTRUCTOR_STANDINGS = [
  { season: '2026', constructorId: 'red_bull',     position: '1', points: '260', wins: '5' },
  { season: '2026', constructorId: 'ferrari',      position: '2', points: '260', wins: '3' },
  { season: '2026', constructorId: 'mclaren',      position: '3', points: '250', wins: '3' },
  { season: '2026', constructorId: 'mercedes',     position: '4', points: '200', wins: '1' },
  { season: '2026', constructorId: 'aston_martin', position: '5', points: '60',  wins: '0' },
];

// ─── Races ───────────────────────────────────────────────────────────────────

export const CSV_RACES = [
  { season: '2026', round: '1', raceName: 'Australian Grand Prix',  circuitId: 'albert_park',  circuitName: 'Albert Park',   locality: 'Melbourne', country: 'Australia', lat: '-37.8497', long: '144.968', date: '2026-03-15' },
  { season: '2026', round: '2', raceName: 'Bahrain Grand Prix',     circuitId: 'bahrain',      circuitName: 'Bahrain Intl',  locality: 'Sakhir',    country: 'Bahrain',   lat: '26.0325',  long: '50.5106', date: '2026-03-29' },
  { season: '2026', round: '3', raceName: 'Saudi Arabian Grand Prix', circuitId: 'jeddah',     circuitName: 'Jeddah Corniche', locality: 'Jeddah',  country: 'Saudi Arabia', lat: '21.6319', long: '39.1044', date: '2026-04-12' },
];

// ─── Race results (3 races, 10 drivers each) ────────────────────────────────

export const CSV_RACE_RESULTS = [
  // Race 1 – Australian GP
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'max_verstappen',  constructorId: 'red_bull',     position: '1',  grid: '1',  points: '25', laps: '58', status: 'Finished',  fastestLapRank: '1' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'charles_leclerc', constructorId: 'ferrari',      position: '2',  grid: '3',  points: '18', laps: '58', status: 'Finished',  fastestLapRank: '5' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'lando_norris',    constructorId: 'mclaren',      position: '3',  grid: '2',  points: '15', laps: '58', status: 'Finished',  fastestLapRank: '3' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'lewis_hamilton',   constructorId: 'mercedes',     position: '4',  grid: '5',  points: '12', laps: '58', status: 'Finished',  fastestLapRank: '7' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'oscar_piastri',   constructorId: 'mclaren',      position: '5',  grid: '4',  points: '10', laps: '58', status: 'Finished',  fastestLapRank: '2' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'carlos_sainz',    constructorId: 'ferrari',      position: '6',  grid: '6',  points: '8',  laps: '58', status: 'Finished',  fastestLapRank: '4' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'george_russell',  constructorId: 'mercedes',     position: '7',  grid: '7',  points: '6',  laps: '58', status: 'Finished',  fastestLapRank: '6' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'sergio_perez',    constructorId: 'red_bull',     position: '8',  grid: '9',  points: '4',  laps: '58', status: 'Finished',  fastestLapRank: '8' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'fernando_alonso', constructorId: 'aston_martin', position: '9',  grid: '8',  points: '2',  laps: '58', status: 'Finished',  fastestLapRank: '9' },
  { season: '2026', round: '1', circuitId: 'albert_park', driverId: 'lance_stroll',    constructorId: 'aston_martin', position: '10', grid: '10', points: '1',  laps: '58', status: 'Finished',  fastestLapRank: '10' },

  // Race 2 – Bahrain GP (with a DNF for Perez)
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'max_verstappen',  constructorId: 'red_bull',     position: '1',  grid: '1',  points: '25', laps: '57', status: 'Finished', fastestLapRank: '3' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'lando_norris',    constructorId: 'mclaren',      position: '2',  grid: '2',  points: '18', laps: '57', status: 'Finished', fastestLapRank: '1' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'charles_leclerc', constructorId: 'ferrari',      position: '3',  grid: '4',  points: '15', laps: '57', status: 'Finished', fastestLapRank: '2' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'oscar_piastri',   constructorId: 'mclaren',      position: '4',  grid: '3',  points: '12', laps: '57', status: 'Finished', fastestLapRank: '5' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'george_russell',  constructorId: 'mercedes',     position: '5',  grid: '5',  points: '10', laps: '57', status: 'Finished', fastestLapRank: '4' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'carlos_sainz',    constructorId: 'ferrari',      position: '6',  grid: '7',  points: '8',  laps: '57', status: 'Finished', fastestLapRank: '6' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'lewis_hamilton',   constructorId: 'mercedes',     position: '7',  grid: '6',  points: '6',  laps: '57', status: 'Finished', fastestLapRank: '7' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'fernando_alonso', constructorId: 'aston_martin', position: '8',  grid: '8',  points: '4',  laps: '57', status: 'Finished', fastestLapRank: '8' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'lance_stroll',    constructorId: 'aston_martin', position: '9',  grid: '10', points: '2',  laps: '57', status: 'Finished', fastestLapRank: '9' },
  { season: '2026', round: '2', circuitId: 'bahrain', driverId: 'sergio_perez',    constructorId: 'red_bull',     position: '20', grid: '9',  points: '0',  laps: '30', status: 'Engine',   fastestLapRank: '' },

  // Race 3 – Saudi Arabian GP (with a disqualification for Norris)
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'charles_leclerc', constructorId: 'ferrari',      position: '1',  grid: '1',  points: '25', laps: '50', status: 'Finished',      fastestLapRank: '1' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'max_verstappen',  constructorId: 'red_bull',     position: '2',  grid: '3',  points: '18', laps: '50', status: 'Finished',      fastestLapRank: '2' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'lewis_hamilton',   constructorId: 'mercedes',     position: '3',  grid: '4',  points: '15', laps: '50', status: 'Finished',      fastestLapRank: '5' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'carlos_sainz',    constructorId: 'ferrari',      position: '4',  grid: '2',  points: '12', laps: '50', status: 'Finished',      fastestLapRank: '4' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'oscar_piastri',   constructorId: 'mclaren',      position: '5',  grid: '5',  points: '10', laps: '50', status: 'Finished',      fastestLapRank: '3' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'george_russell',  constructorId: 'mercedes',     position: '6',  grid: '7',  points: '8',  laps: '50', status: 'Finished',      fastestLapRank: '6' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'sergio_perez',    constructorId: 'red_bull',     position: '7',  grid: '6',  points: '6',  laps: '50', status: 'Finished',      fastestLapRank: '7' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'fernando_alonso', constructorId: 'aston_martin', position: '8',  grid: '8',  points: '4',  laps: '50', status: 'Finished',      fastestLapRank: '8' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'lance_stroll',    constructorId: 'aston_martin', position: '9',  grid: '10', points: '2',  laps: '50', status: 'Finished',      fastestLapRank: '9' },
  { season: '2026', round: '3', circuitId: 'jeddah', driverId: 'lando_norris',    constructorId: 'mclaren',      position: '20', grid: '9',  points: '0',  laps: '50', status: 'Disqualified', fastestLapRank: '10' },
];

// ─── Qualifying results ──────────────────────────────────────────────────────

export const CSV_QUALIFYING = [
  // Race 1 – Australian GP
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'max_verstappen',  position: '1',  q1: '1:18.456', q2: '1:17.890', q3: '1:17.123' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'lando_norris',    position: '2',  q1: '1:18.567', q2: '1:17.901', q3: '1:17.234' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'charles_leclerc', position: '3',  q1: '1:18.678', q2: '1:17.912', q3: '1:17.345' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'oscar_piastri',   position: '4',  q1: '1:18.789', q2: '1:17.923', q3: '1:17.456' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'lewis_hamilton',   position: '5',  q1: '1:18.890', q2: '1:18.034', q3: '1:17.567' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'carlos_sainz',    position: '6',  q1: '1:18.901', q2: '1:18.145', q3: '1:17.678' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'george_russell',  position: '7',  q1: '1:19.012', q2: '1:18.256', q3: '1:17.789' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'fernando_alonso', position: '8',  q1: '1:19.123', q2: '1:18.367', q3: '1:17.890' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'sergio_perez',    position: '9',  q1: '1:19.234', q2: '1:18.478', q3: '1:18.012' },
  { raceId: '2026_01', season: '2026', round: '1', circuitId: 'albert_park', driverId: 'lance_stroll',    position: '10', q1: '1:19.345', q2: '1:18.589', q3: '1:18.123' },

  // Race 2 – Bahrain GP
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'max_verstappen',  position: '1',  q1: '1:28.456', q2: '1:27.890', q3: '1:27.123' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'lando_norris',    position: '2',  q1: '1:28.567', q2: '1:27.901', q3: '1:27.234' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'oscar_piastri',   position: '3',  q1: '1:28.678', q2: '1:27.912', q3: '1:27.345' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'charles_leclerc', position: '4',  q1: '1:28.789', q2: '1:27.923', q3: '1:27.456' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'george_russell',  position: '5',  q1: '1:28.890', q2: '1:28.034', q3: '1:27.567' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'lewis_hamilton',   position: '6',  q1: '1:28.901', q2: '1:28.145', q3: '1:27.678' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'carlos_sainz',    position: '7',  q1: '1:29.012', q2: '1:28.256', q3: '1:27.789' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'fernando_alonso', position: '8',  q1: '1:29.123', q2: '1:28.367', q3: '1:27.890' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'sergio_perez',    position: '9',  q1: '1:29.234', q2: '1:28.478', q3: '1:28.012' },
  { raceId: '2026_02', season: '2026', round: '2', circuitId: 'bahrain', driverId: 'lance_stroll',    position: '10', q1: '1:29.345', q2: '1:28.589', q3: '1:28.123' },

  // Race 3 – Saudi Arabian GP
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'charles_leclerc', position: '1',  q1: '1:26.456', q2: '1:25.890', q3: '1:25.123' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'carlos_sainz',    position: '2',  q1: '1:26.567', q2: '1:25.901', q3: '1:25.234' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'max_verstappen',  position: '3',  q1: '1:26.678', q2: '1:25.912', q3: '1:25.345' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'lewis_hamilton',   position: '4',  q1: '1:26.789', q2: '1:25.923', q3: '1:25.456' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'oscar_piastri',   position: '5',  q1: '1:26.890', q2: '1:26.034', q3: '1:25.567' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'sergio_perez',    position: '6',  q1: '1:26.901', q2: '1:26.145', q3: '1:25.678' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'george_russell',  position: '7',  q1: '1:27.012', q2: '1:26.256', q3: '1:25.789' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'fernando_alonso', position: '8',  q1: '1:27.123', q2: '1:26.367', q3: '1:25.890' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'lando_norris',    position: '9',  q1: '1:27.234', q2: '1:26.478', q3: '1:25.912' },
  { raceId: '2026_03', season: '2026', round: '3', circuitId: 'jeddah', driverId: 'lance_stroll',    position: '10', q1: '1:27.345', q2: '1:26.589', q3: '1:26.012' },
];
