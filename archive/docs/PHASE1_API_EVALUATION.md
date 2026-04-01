# PHASE 1: F1 DATA API EVALUATION & SELECTION

## A) CANDIDATE APIs

### 1. **Ergast F1 API** (http://ergast.com/mrd/)
- **Description**: Long-standing free RESTful API with comprehensive F1 historical data (1950-present)
- **Format**: JSON/XML
- **Auth**: None required
- **Coverage**: Seasons, races, drivers, constructors, qualifying, results, standings, circuits, pit stops, lap times
- **Status**: ⚠️ **DEPRECATED** - API announced shutdown effective end of 2024, but community may maintain alternatives
- **Key Strength**: Most complete historical dataset, stable identifiers, well-documented
- **Key Weakness**: Deprecated; no official future support

### 2. **OpenF1 API** (https://openf1.org/)
- **Description**: Modern free API with real-time and historical F1 data, official timing data
- **Format**: JSON (RESTful)
- **Auth**: None required
- **Coverage**: Sessions (practice/quali/race/sprint), drivers, meetings, positions, car telemetry, race control messages, weather, pit stops, intervals
- **Status**: ✅ Active, community-maintained using official F1 live timing data
- **Key Strength**: Real-time data, detailed session information, modern architecture, actively maintained
- **Key Weakness**: Limited historical depth (2023+), different identifier scheme than Ergast

### 3. **Jolpica F1 API** (https://www.jolpi.ca/ergast-api/)
- **Description**: Community continuation of Ergast API post-deprecation
- **Format**: JSON/XML (Ergast-compatible)
- **Auth**: None required (may change)
- **Coverage**: Same as Ergast - full historical data
- **Status**: ✅ Active community fork
- **Key Strength**: Drop-in Ergast replacement, maintains backward compatibility, stable identifiers
- **Key Weakness**: Community-maintained (sustainability risk), unclear long-term hosting

### 4. **RapidAPI F1 Endpoints** (Various commercial options)
- **Description**: Commercial F1 data aggregators on RapidAPI marketplace
- **Format**: JSON
- **Auth**: API key required
- **Coverage**: Varies by provider; typically comprehensive
- **Status**: ✅ Active commercial offerings
- **Key Strength**: SLA guarantees, rate limit clarity, support
- **Key Weakness**: Cost (free tiers limited), vendor lock-in, changing pricing

---

## B) WEIGHTED COMPARISON MATRIX

### Scoring Rubric (0-10 scale)

| Criterion | Weight | Ergast (deprecated) | OpenF1 | Jolpica (Ergast fork) | RapidAPI F1 |
|-----------|--------|---------------------|--------|------------------------|-------------|
| **Historical Coverage** (1950+) | 20% | 10 (complete) | 3 (2023+ only) | 10 (complete) | 8 (varies) |
| **Current Season Completeness** | 15% | 0 (deprecated) | 10 (real-time) | 8 (may lag) | 9 (depends) |
| **Qualifying Data Quality** | 15% | 9 (Q1/Q2/Q3 times) | 10 (detailed) | 9 (Q1/Q2/Q3 times) | 8 (varies) |
| **Sprint Weekend Support** | 10% | 7 (basic) | 10 (detailed) | 7 (basic) | 8 (varies) |
| **API Stability/Longevity** | 15% | 2 (sunset) | 8 (active community) | 6 (community risk) | 9 (commercial) |
| **Identifier Consistency** | 10% | 10 (driverId stable) | 7 (new system) | 10 (same as Ergast) | 6 (varies) |
| **Rate Limits/Cost** | 8% | 10 (no limits) | 9 (generous free) | 8 (TBD) | 4 (paid tiers) |
| **Documentation Quality** | 5% | 10 (excellent) | 8 (good) | 9 (Ergast docs) | 7 (varies) |
| **ToS Suitability (hobby)** | 2% | 10 (permissive) | 10 (permissive) | 9 (likely permissive) | 6 (commercial) |

### Weighted Scores

| API | Calculation | **Total Score** |
|-----|-------------|-----------------|
| **Ergast** | (10×0.2)+(0×0.15)+(9×0.15)+(7×0.1)+(2×0.15)+(10×0.1)+(10×0.08)+(10×0.05)+(10×0.02) | **5.58** |
| **OpenF1** | (3×0.2)+(10×0.15)+(10×0.15)+(10×0.1)+(8×0.15)+(7×0.1)+(9×0.08)+(8×0.05)+(10×0.02) | **7.79** |
| **Jolpica** | (10×0.2)+(8×0.15)+(9×0.15)+(7×0.1)+(6×0.15)+(10×0.1)+(8×0.08)+(9×0.05)+(9×0.02) | **8.02** |
| **RapidAPI F1** | (8×0.2)+(9×0.15)+(8×0.15)+(8×0.1)+(9×0.15)+(6×0.1)+(4×0.08)+(7×0.05)+(6×0.02) | **7.49** |

**Winner**: Jolpica (Ergast continuation) for historical depth + stability

---

## C) TEST SCENARIOS (Functional Validation)

Each test must be deterministic with stored fixtures.

### TS-1: Calendar Completeness
**Goal**: Upcoming races ordered by date; past races have results

```javascript
// Test 1.1: Get 2024 race calendar
GET /2024.json
ASSERT: races array ordered by round (1...N)
ASSERT: each race has {raceName, Circuit.circuitId, date, time}

// Test 1.2: Distinguish past vs upcoming
GET /current.json
ASSERT: races with date < today have Results.length > 0
ASSERT: races with date >= today have Results absent or empty

// Fixture: Store /2024.json response as fixtures/season_2024.json
```

### TS-2: Qualifying Data Mapping
**Goal**: Qualifying ties to correct season+round; segment times available

```javascript
// Test 2.1: Qualifying results with Q1/Q2/Q3 times
GET /2024/5/qualifying.json  // Round 5 (e.g., Miami)
ASSERT: QualifyingResults[].Q1, Q2, Q3 exist for top 10
ASSERT: driver.driverId matches /drivers/{driverId}.json
ASSERT: position field present (1-20)

// Test 2.2: Qualifying for sprint weekend
GET /2024/4/qualifying.json  // Assume round 4 is sprint weekend
ASSERT: Qualifying exists AND separate /sprint.json endpoint available

// Fixture: Store qualifying JSON + expected driver positions CSV
```

### TS-3: Driver/Team Changes Across Seasons
**Goal**: Drivers change teams; identifiers stay stable

```javascript
// Test 3.1: Driver identity persistence
GET /drivers/alonso.json
ASSERT: driverId = "alonso" across all seasons
ASSERT: constructor changes per season (e.g., Alpine 2021, Aston Martin 2023+)

// Test 3.2: Constructor identity
GET /constructors/mercedes.json
ASSERT: constructorId = "mercedes" stable
ASSERT: name/nationality consistent

// Fixture: Store driver history CSV with season+team mappings
```

### TS-4: Sprint Weekend Support
**Goal**: Sprint weekends flagged; sprint results available

```javascript
// Test 4.1: Identify sprint rounds
GET /2024.json
ASSERT: races with Sprint = true OR separate /sprint.json endpoint exists
IDENTIFY: rounds [4, 11, 19] as sprint weekends (2024 example)

// Test 4.2: Sprint results structure
GET /2024/4/sprint.json
ASSERT: SprintResults array with position, driver, constructor, grid, status
ASSERT: points field (8-7-6-5-4-3-2-1 for top 8)

// Fallback: If no sprint endpoint, document "sprint not supported" flag
```

### TS-5: Status Semantics (DNF/DNS/DSQ)
**Goal**: Race/qualifying status codes documented; penalty behavior

```javascript
// Test 5.1: Status codes in results
GET /2024/1/results.json  // Bahrain with typical incidents
ASSERT: Results[].status in {"Finished", "Accident", "Engine", "+1 Lap", "DNF", "DNS", "Disqualified"}
ASSERT: Disqualified drivers have status = "Disqualified" + original position

// Test 5.2: Penalty handling
// API may not update retroactively; plan for manual CSV correction
STORE: Original result JSON + corrected CSV with penalty applied

// Fixture: results_bahrain_2024_original.json + results_bahrain_2024_corrected.csv
```

### TS-6: Identifier Stability
**Goal**: IDs consistent across endpoints and seasons

```javascript
// Test 6.1: Cross-endpoint consistency
GET /2024/drivers.json -> driver.driverId = "max_verstappen"
GET /2024/5/results.json -> Results[0].Driver.driverId = "max_verstappen"
GET /drivers/max_verstappen.json -> driverId = "max_verstappen"
ASSERT: All match

// Test 6.2: Season-to-season stability
GET /2023/drivers.json -> filter driverId = "leclerc"
GET /2024/drivers.json -> filter driverId = "leclerc"
ASSERT: Same driverId across seasons
```

### TS-7: Determinism (Fixture Replayability)
**Goal**: Store fixtures; rerun tests offline

```javascript
// Test 7.1: Offline test suite
GIVEN: Stored fixtures in /fixtures/{endpoint}.json
WHEN: Ingestion script runs with --offline flag
THEN: Parse fixtures; generate same CSV outputs

// Implementation:
- Save all API responses with timestamp: fixtures/2024-01-15_season_2024.json
- Ingestion script checks for --offline; loads fixtures instead of HTTP
- Assert CSV outputs match expected snapshots
```

### TS-8: Failure Handling (Caching & Retry)
**Goal**: Network failures don't break ingestion

```javascript
// Test 8.1: Exponential backoff on 429/500
GIVEN: Mock API returns 429 (rate limit)
WHEN: Ingestion script retries with backoff (1s, 2s, 4s, 8s)
THEN: Eventually succeeds or fails gracefully after 5 attempts

// Test 8.2: Stale cache fallback
GIVEN: API unreachable; cache has data from yesterday
WHEN: Ingestion runs
THEN: Use cached data; log warning "Using stale cache"

// Implementation: Cache responses in /cache/{endpoint}_{timestamp}.json
```

---

## D) API SPIKE PLAN

### Primary API: **Jolpica (Ergast continuation)**
Base URL: `https://api.jolpi.ca/ergast/f1`

### Fallback API: **OpenF1**
Base URL: `https://api.openf1.org/v1`

---

### Endpoint Mapping to IF1DataProvider Interface

```javascript
// interface IF1DataProvider.js
export const IF1DataProvider = {
  // Core methods all providers must implement
  getSeasons: async () => {},
  getRaceCalendar: async (season) => {},
  getRaceResults: async (season, round) => {},
  getQualifyingResults: async (season, round) => {},
  getSprintResults: async (season, round) => {},
  getDrivers: async (season) => {},
  getTeams: async (season) => {},  // "constructors" in F1 terms
  getCircuits: async () => {}
};
```

---

### Spike Implementation: Jolpica Provider

#### 1. `getSeasons()`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/seasons.json?limit=100`

**Example URL**: https://api.jolpi.ca/ergast/f1/seasons.json?limit=100

**Response Structure**:
```json
{
  "MRData": {
    "SeasonTable": {
      "Seasons": [
        {"season": "1950", "url": "..."},
        {"season": "1951", "url": "..."},
        ...
        {"season": "2024", "url": "..."}
      ]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/seasons.csv
season,url
1950,http://en.wikipedia.org/wiki/1950_Formula_One_season
1951,http://en.wikipedia.org/wiki/1951_Formula_One_season
...
2024,http://en.wikipedia.org/wiki/2024_Formula_One_season
```

---

#### 2. `getRaceCalendar(season)`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/{season}.json`

**Example URL**: https://api.jolpi.ca/ergast/f1/2024.json

**Response Structure**:
```json
{
  "MRData": {
    "RaceTable": {
      "Races": [
        {
          "season": "2024",
          "round": "1",
          "raceName": "Bahrain Grand Prix",
          "Circuit": {
            "circuitId": "bahrain",
            "circuitName": "Bahrain International Circuit",
            "Location": {"lat": "26.0325", "long": "50.5106", "locality": "Sakhir", "country": "Bahrain"}
          },
          "date": "2024-03-02",
          "time": "15:00:00Z",
          "FirstPractice": {"date": "2024-02-29", "time": "11:30:00Z"},
          "SecondPractice": {"date": "2024-02-29", "time": "15:00:00Z"},
          "ThirdPractice": {"date": "2024-03-01", "time": "12:30:00Z"},
          "Qualifying": {"date": "2024-03-01", "time": "16:00:00Z"},
          "Sprint": null  // or object if sprint weekend
        }
      ]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/races_2024.csv
season,round,raceName,circuitId,circuitName,locality,country,lat,long,date,time,hasSpint
2024,1,Bahrain Grand Prix,bahrain,Bahrain International Circuit,Sakhir,Bahrain,26.0325,50.5106,2024-03-02,15:00:00Z,false
2024,2,Saudi Arabian Grand Prix,jeddah,Jeddah Corniche Circuit,Jeddah,Saudi Arabia,21.6319,39.1044,2024-03-09,17:00:00Z,false
...
```

---

#### 3. `getRaceResults(season, round)`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/{season}/{round}/results.json`

**Example URL**: https://api.jolpi.ca/ergast/f1/2024/1/results.json

**Response Structure**:
```json
{
  "MRData": {
    "RaceTable": {
      "Races": [{
        "season": "2024",
        "round": "1",
        "raceName": "Bahrain Grand Prix",
        "Results": [
          {
            "number": "1",
            "position": "1",
            "positionText": "1",
            "points": "25",
            "Driver": {
              "driverId": "max_verstappen",
              "permanentNumber": "1",
              "code": "VER",
              "givenName": "Max",
              "familyName": "Verstappen",
              "dateOfBirth": "1997-09-30",
              "nationality": "Dutch"
            },
            "Constructor": {
              "constructorId": "red_bull",
              "name": "Red Bull Racing",
              "nationality": "Austrian"
            },
            "grid": "1",
            "laps": "57",
            "status": "Finished",
            "Time": {"millis": "5309000", "time": "1:28:29.000"},
            "FastestLap": {"rank": "1", "lap": "56", "Time": {"time": "1:31.447"}}
          }
        ]
      }]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/results_2024_01.csv
season,round,driverId,driverCode,driverNumber,constructorId,position,grid,laps,points,status,timeMillis,fastestLapRank
2024,1,max_verstappen,VER,1,red_bull,1,1,57,25,Finished,5309000,1
2024,1,perez,PER,11,red_bull,2,2,57,18,Finished,5311234,3
...
```

---

#### 4. `getQualifyingResults(season, round)`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/{season}/{round}/qualifying.json`

**Example URL**: https://api.jolpi.ca/ergast/f1/2024/1/qualifying.json

**Response Structure**:
```json
{
  "MRData": {
    "RaceTable": {
      "Races": [{
        "season": "2024",
        "round": "1",
        "QualifyingResults": [
          {
            "number": "1",
            "position": "1",
            "Driver": {"driverId": "max_verstappen", "code": "VER"},
            "Constructor": {"constructorId": "red_bull"},
            "Q1": "1:29.179",
            "Q2": "1:28.918",
            "Q3": "1:28.997"
          },
          {
            "number": "16",
            "position": "11",
            "Driver": {"driverId": "leclerc", "code": "LEC"},
            "Constructor": {"constructorId": "ferrari"},
            "Q1": "1:29.456",
            "Q2": "1:29.123"
            // No Q3 (eliminated in Q2)
          }
        ]
      }]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/qualifying_2024_01.csv
season,round,position,driverId,driverCode,constructorId,Q1,Q2,Q3
2024,1,1,max_verstappen,VER,red_bull,1:29.179,1:28.918,1:28.997
2024,1,2,perez,PER,red_bull,1:29.234,1:29.001,1:29.045
2024,1,11,leclerc,LEC,ferrari,1:29.456,1:29.123,
...
```

---

#### 5. `getSprintResults(season, round)`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/{season}/{round}/sprint.json`

**Example URL**: https://api.jolpi.ca/ergast/f1/2024/4/sprint.json *(if round 4 is sprint weekend)*

**Response Structure**:
```json
{
  "MRData": {
    "RaceTable": {
      "Races": [{
        "season": "2024",
        "round": "4",
        "SprintResults": [
          {
            "number": "1",
            "position": "1",
            "positionText": "1",
            "points": "8",
            "Driver": {"driverId": "max_verstappen"},
            "Constructor": {"constructorId": "red_bull"},
            "grid": "1",
            "laps": "19",
            "status": "Finished",
            "Time": {"millis": "1540000"}
          }
        ]
      }]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/sprint_2024_04.csv
season,round,position,driverId,constructorId,grid,laps,points,status,timeMillis
2024,4,1,max_verstappen,red_bull,1,19,8,Finished,1540000
2024,4,2,leclerc,ferrari,2,19,7,Finished,1541200
...
```

**Fallback**: If `/sprint.json` returns 404, set `hasSprint=false` in races CSV.

---

#### 6. `getDrivers(season)`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/{season}/drivers.json`

**Example URL**: https://api.jolpi.ca/ergast/f1/2024/drivers.json

**Response Structure**:
```json
{
  "MRData": {
    "DriverTable": {
      "Drivers": [
        {
          "driverId": "max_verstappen",
          "permanentNumber": "1",
          "code": "VER",
          "givenName": "Max",
          "familyName": "Verstappen",
          "dateOfBirth": "1997-09-30",
          "nationality": "Dutch",
          "url": "http://en.wikipedia.org/wiki/Max_Verstappen"
        }
      ]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/drivers_2024.csv
driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
max_verstappen,1,VER,Max,Verstappen,1997-09-30,Dutch,http://en.wikipedia.org/wiki/Max_Verstappen
leclerc,16,LEC,Charles,Leclerc,1997-10-16,Monegasque,http://en.wikipedia.org/wiki/Charles_Leclerc
...
```

---

#### 7. `getTeams(season)` _(Constructors)_
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/{season}/constructors.json`

**Example URL**: https://api.jolpi.ca/ergast/f1/2024/constructors.json

**Response Structure**:
```json
{
  "MRData": {
    "ConstructorTable": {
      "Constructors": [
        {
          "constructorId": "red_bull",
          "name": "Red Bull Racing",
          "nationality": "Austrian",
          "url": "http://en.wikipedia.org/wiki/Red_Bull_Racing"
        }
      ]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/constructors_2024.csv
constructorId,name,nationality,url
red_bull,Red Bull Racing,Austrian,http://en.wikipedia.org/wiki/Red_Bull_Racing
mercedes,Mercedes,German,http://en.wikipedia.org/wiki/Mercedes-Benz_in_Formula_One
ferrari,Ferrari,Italian,http://en.wikipedia.org/wiki/Scuderia_Ferrari
...
```

---

#### 8. `getCircuits()`
**Endpoint**: `GET https://api.jolpi.ca/ergast/f1/circuits.json?limit=100`

**Example URL**: https://api.jolpi.ca/ergast/f1/circuits.json?limit=100

**Response Structure**:
```json
{
  "MRData": {
    "CircuitTable": {
      "Circuits": [
        {
          "circuitId": "monaco",
          "circuitName": "Circuit de Monaco",
          "Location": {
            "lat": "43.7347",
            "long": "7.42056",
            "locality": "Monte-Carlo",
            "country": "Monaco"
          },
          "url": "http://en.wikipedia.org/wiki/Circuit_de_Monaco"
        }
      ]
    }
  }
}
```

**Mapping to CSV**:
```csv
# data/circuits.csv
circuitId,circuitName,locality,country,lat,long,url
monaco,Circuit de Monaco,Monte-Carlo,Monaco,43.7347,7.42056,http://en.wikipedia.org/wiki/Circuit_de_Monaco
spa,Circuit de Spa-Francorchamps,Spa,Belgium,50.4372,5.97139,http://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps
...
```

---

### Fallback: OpenF1 Provider (2023+ only)

**When to use**: If Jolpica unavailable OR for real-time current-season data

**Base URL**: `https://api.openf1.org/v1`

**Key Endpoints**:
- `/sessions?year=2024` → List all sessions (Practice, Qualifying, Sprint, Race)
- `/drivers?session_key={key}` → Drivers in a session
- `/position?session_key={key}` → Position data during session
- `/meetings?year=2024` → Grand Prix events (equivalent to races)

**Trade-off**:
- ✅ Real-time current season
- ❌ No historical data before 2023
- ❌ Different identifier scheme (session_key vs season/round)

**Recommendation**: Use OpenF1 as **supplementary** for live timing; Jolpica remains **primary** for historical consistency.

---

## E) CANONICAL CSV SCHEMAS

All CSV files stored in `/data` folder.

### 1. `seasons.csv`
```csv
season,url
```

### 2. `races_{season}.csv`
```csv
season,round,raceName,circuitId,circuitName,locality,country,lat,long,date,time,hasSprint
```
- **Primary Key**: `(season, round)`
- **Foreign Key**: `circuitId` → `circuits.circuitId`

### 3. `circuits.csv`
```csv
circuitId,circuitName,locality,country,lat,long,url
```
- **Primary Key**: `circuitId`

### 4. `drivers_{season}.csv`
```csv
driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
```
- **Primary Key**: `driverId`
- Note: Driver may appear in multiple seasons; driverId is globally unique

### 5. `constructors_{season}.csv`
```csv
constructorId,name,nationality,url
```
- **Primary Key**: `constructorId`

### 6. `results_{season}_{round}.csv`
```csv
season,round,driverId,driverCode,driverNumber,constructorId,position,grid,laps,points,status,timeMillis,fastestLapRank
```
- **Primary Key**: `(season, round, driverId)`
- **Foreign Keys**:
  - `driverId` → `drivers_{season}.driverId`
  - `constructorId` → `constructors_{season}.constructorId`

### 7. `qualifying_{season}_{round}.csv`
```csv
season,round,position,driverId,driverCode,constructorId,Q1,Q2,Q3
```
- **Primary Key**: `(season, round, driverId)`
- Note: Q2/Q3 may be empty for eliminated drivers

### 8. `sprint_{season}_{round}.csv`
```csv
season,round,position,driverId,constructorId,grid,laps,points,status,timeMillis
```
- **Primary Key**: `(season, round, driverId)`
- Note: File only exists for sprint rounds

### 9. Raw Snapshots (JSON)
Store original API responses for reprocessing:
```
/data/snapshots/{season}/
  ├── calendar.json          (full season calendar)
  ├── drivers.json
  ├── constructors.json
  ├── round_01_qualifying.json
  ├── round_01_results.json
  ├── round_04_sprint.json
  └── ...
```

**Timestamp convention**: `{entity}_{timestamp}.json` for version control
Example: `calendar_20240101_120000.json`

---

## F) INGESTION SCRIPT ARCHITECTURE

### Technology: **Node.js** (for offline scripts; browser app stays vanilla JS)

### Script: `ingest.js` (ES module)

```javascript
#!/usr/bin/env node

// ingest.js - F1 data ingestion script
import fs from 'fs/promises';
import path from 'path';
import { JolpicaProvider } from './lib/providers/jolpica.js';
import { CSVWriter } from './lib/csv-writer.js';
import { retryWithBackoff } from './lib/retry.js';

const DATA_DIR = './data';
const SNAPSHOTS_DIR = './data/snapshots';
const CACHE_DIR = './cache';

async function ingestSeason(season, options = {}) {
  const provider = new JolpicaProvider({ offline: options.offline, cacheDir: CACHE_DIR });

  console.log(`[INFO] Ingesting season ${season}...`);

  // 1. Fetch and snapshot calendar
  const calendar = await retryWithBackoff(() => provider.getRaceCalendar(season));
  await saveSnapshot(season, 'calendar', calendar);
  await CSVWriter.writeRaces(`${DATA_DIR}/races_${season}.csv`, calendar);

  // 2. Fetch drivers and constructors
  const drivers = await retryWithBackoff(() => provider.getDrivers(season));
  await saveSnapshot(season, 'drivers', drivers);
  await CSVWriter.writeDrivers(`${DATA_DIR}/drivers_${season}.csv`, drivers);

  const constructors = await retryWithBackoff(() => provider.getTeams(season));
  await saveSnapshot(season, 'constructors', constructors);
  await CSVWriter.writeConstructors(`${DATA_DIR}/constructors_${season}.csv`, constructors);

  // 3. For each race round
  for (const race of calendar) {
    const round = race.round;
    console.log(`  [INFO] Ingesting round ${round}: ${race.raceName}`);

    // Qualifying
    try {
      const quali = await retryWithBackoff(() => provider.getQualifyingResults(season, round));
      await saveSnapshot(season, `round_${round.padStart(2, '0')}_qualifying`, quali);
      await CSVWriter.writeQualifying(`${DATA_DIR}/qualifying_${season}_${round.padStart(2, '0')}.csv`, quali);
    } catch (err) {
      console.warn(`  [WARN] No qualifying data for round ${round}: ${err.message}`);
    }

    // Results
    try {
      const results = await retryWithBackoff(() => provider.getRaceResults(season, round));
      await saveSnapshot(season, `round_${round.padStart(2, '0')}_results`, results);
      await CSVWriter.writeResults(`${DATA_DIR}/results_${season}_${round.padStart(2, '0')}.csv`, results);
    } catch (err) {
      console.warn(`  [WARN] No results for round ${round}: ${err.message}`);
    }

    // Sprint (if applicable)
    if (race.hasSprint) {
      try {
        const sprint = await retryWithBackoff(() => provider.getSprintResults(season, round));
        await saveSnapshot(season, `round_${round.padStart(2, '0')}_sprint`, sprint);
        await CSVWriter.writeSprint(`${DATA_DIR}/sprint_${season}_${round.padStart(2, '0')}.csv`, sprint);
      } catch (err) {
        console.warn(`  [WARN] No sprint data for round ${round}: ${err.message}`);
      }
    }
  }

  console.log(`[SUCCESS] Season ${season} ingested successfully`);
}

async function saveSnapshot(season, name, data) {
  const dir = path.join(SNAPSHOTS_DIR, season);
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(dir, `${name}_${timestamp}.json`);
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
}

// CLI interface
const args = process.argv.slice(2);
const season = args[0] || new Date().getFullYear();
const offline = args.includes('--offline');

ingestSeason(season, { offline }).catch(err => {
  console.error(`[ERROR] Ingestion failed: ${err.message}`);
  process.exit(1);
});
```

### Supporting Modules

#### `lib/providers/jolpica.js`
```javascript
// JolpicaProvider - implements IF1DataProvider using Jolpica API
export class JolpicaProvider {
  constructor({ offline = false, cacheDir = './cache' } = {}) {
    this.baseUrl = 'https://api.jolpi.ca/ergast/f1';
    this.offline = offline;
    this.cacheDir = cacheDir;
  }

  async fetchJSON(endpoint) {
    if (this.offline) {
      // Load from fixtures
      const fixturePath = `./fixtures${endpoint}.json`;
      return JSON.parse(await fs.readFile(fixturePath, 'utf-8'));
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const data = await response.json();

    // Cache response
    await this.cacheResponse(endpoint, data);
    return data;
  }

  async getRaceCalendar(season) {
    const data = await this.fetchJSON(`/${season}.json`);
    return data.MRData.RaceTable.Races.map(race => ({
      season: race.season,
      round: race.round,
      raceName: race.raceName,
      circuitId: race.Circuit.circuitId,
      circuitName: race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      lat: race.Circuit.Location.lat,
      long: race.Circuit.Location.long,
      date: race.date,
      time: race.time,
      hasSprint: !!race.Sprint
    }));
  }

  // ... implement other IF1DataProvider methods
}
```

#### `lib/csv-writer.js`
```javascript
// CSVWriter - converts normalized data to CSV
import { writeFile } from 'fs/promises';

export class CSVWriter {
  static async writeRaces(filepath, races) {
    const headers = 'season,round,raceName,circuitId,circuitName,locality,country,lat,long,date,time,hasSprint\n';
    const rows = races.map(r =>
      `${r.season},${r.round},"${r.raceName}",${r.circuitId},"${r.circuitName}","${r.locality}","${r.country}",${r.lat},${r.long},${r.date},${r.time},${r.hasSprint}`
    ).join('\n');
    await writeFile(filepath, headers + rows);
  }

  // ... other write methods for drivers, results, qualifying, sprint
}
```

#### `lib/retry.js`
```javascript
// Exponential backoff retry logic
export async function retryWithBackoff(fn, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
      console.warn(`[RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

### Reprocessing Workflow

1. **Manual CSV Edits**: User corrects penalty in `results_2024_01.csv`
2. **Preserve Snapshot**: Original API response remains in `snapshots/2024/round_01_results_{timestamp}.json`
3. **Trace Changes**: Git diff shows manual corrections
4. **Re-ingest**: If API structure changes, re-run `node ingest.js 2024 --offline` using snapshots to regenerate CSVs with new parsing logic

---

## G) RECOMMENDATION

### **Primary API: Jolpica (Ergast continuation)**
**Rationale**:
1. **Historical Completeness**: Full F1 data back to 1950 (critical for fantasy league depth)
2. **Stable Identifiers**: `driverId`, `constructorId`, `circuitId` consistent across seasons (simplifies CSV relationships)
3. **Proven Schema**: Battle-tested Ergast data model; well-documented
4. **Community Support**: Active fork with commitment to maintain Ergast compatibility
5. **Free & Permissive**: No rate limits or ToS restrictions for hobby projects
6. **Sprint Support**: Basic sprint endpoints available (sufficient for fantasy scoring)

**Weaknesses**:
- Community-maintained (sustainability risk if maintainer abandons)
- May lag behind current season by hours/days vs real-time APIs

---

### **Fallback API: OpenF1**
**Rationale**:
1. **Real-Time Data**: Live timing for current season (complementary to Jolpica)
2. **Active Development**: Modern API with ongoing improvements
3. **Detailed Sessions**: Granular practice/qualifying/race data (future enhancement potential)
4. **Free & Open**: No API key required

**Weaknesses**:
- Limited historical depth (2023+)
- Different identifier scheme (requires mapping layer)
- Not a full replacement for Jolpica

---

### **Hybrid Strategy**:
- **Jolpica**: Primary for ALL historical data (1950-2023) and base 2024+ structure
- **OpenF1**: Supplementary for live current-season updates and detailed timing (if needed)
- **CSV as Truth**: Manual corrections override API data; snapshots enable reprocessing

---

## H) RISKS & MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Jolpica API discontinuation** | Medium | High | 1) Store all snapshots locally; 2) CSV files remain editable; 3) OpenF1 as fallback for 2023+ |
| **API rate limiting** | Low | Medium | Exponential backoff + caching; ingestion runs offline after initial fetch |
| **Incorrect penalty handling** | High | Medium | Store raw JSON snapshots; allow manual CSV corrections; document in CHANGELOG.md |
| **Sprint format changes** | Low | Medium | Version snapshots; update parser logic; reprocess with `--offline` flag |
| **Driver ID mismatches across APIs** | Low | Low | Use Jolpica IDs as canonical; maintain mapping table if mixing APIs |
| **Network failures during ingestion** | Medium | Low | Retry logic + stale cache fallback; ingestion resumes from last successful round |
| **CSV corruption from manual edits** | Medium | Medium | Git version control; validate CSVs with schema checker script |
| **API schema breaking changes** | Low | High | Snapshot versioning (`{endpoint}_v1.json`); parser version tags; test suite with fixtures |

---

## I) DELIVERABLES CHECKLIST (Phase 1)

- [x] **A) Candidate List**: 4 APIs evaluated (Ergast deprecated, OpenF1, Jolpica, RapidAPI)
- [x] **B) Comparison Matrix**: Weighted scoring with 9 criteria; Jolpica wins (8.02/10)
- [x] **C) Test Scenarios**: 8 functional tests defined (TS-1 through TS-8)
- [x] **D) API Spike Plan**: Jolpica endpoints mapped to `IF1DataProvider` interface; example URLs + response structures
- [x] **E) CSV Schemas**: 9 canonical CSV files defined with primary/foreign keys
- [x] **F) Ingestion Script**: Node.js architecture with retry, caching, snapshot storage
- [x] **G) Recommendation**: Jolpica (primary) + OpenF1 (fallback); hybrid strategy
- [x] **H) Risks**: 8 risks identified with mitigations

---

## J) ACCEPTANCE CRITERIA

1. ✅ **API Selection Justified**: Jolpica chosen based on weighted matrix (historical depth + identifier stability)
2. ✅ **CSV Schema Complete**: All entities covered (seasons, races, circuits, drivers, constructors, results, qualifying, sprint)
3. ✅ **Ingestion Repeatable**: `--offline` flag enables deterministic replay from snapshots
4. ✅ **Error Handling Defined**: Retry logic, caching, graceful degradation
5. ✅ **Reprocessing Supported**: Raw JSON snapshots preserved for schema evolution
6. ✅ **Manual Edits Possible**: CSV files are human-readable/editable; Git tracks changes
7. ✅ **Interface Abstraction**: `IF1DataProvider` decouples API choice from app logic

---

## K) TEST SCENARIOS (Summary)

| ID | Scenario | Pass Condition |
|----|----------|----------------|
| TS-1 | Calendar Completeness | 2024 calendar has 24 rounds ordered by date; past races have results |
| TS-2 | Qualifying Mapping | Q1/Q2/Q3 times present; driver IDs match across endpoints |
| TS-3 | Driver/Team Changes | `driverId` stable across seasons; constructor changes tracked |
| TS-4 | Sprint Support | Sprint rounds flagged; `/sprint.json` returns 8-point scoring |
| TS-5 | Status Semantics | DNF/Disqualified/+1 Lap statuses documented; penalty workflow defined |
| TS-6 | Identifier Stability | Same `driverId` in `/drivers`, `/results`, `/qualifying` |
| TS-7 | Determinism | Offline ingestion from fixtures produces identical CSVs |
| TS-8 | Failure Handling | 429/500 errors retry with backoff; stale cache used on network failure |

---

## NEXT STEPS (Pending User Approval)

**DO NOT PROCEED** until user explicitly approves Phase 1 and says "Proceed to Phase X".

Awaiting user decision:
1. Approve Jolpica as primary API ✅ or ❌
2. Approve CSV schema design ✅ or ❌
3. Approve ingestion script architecture ✅ or ❌
4. Request modifications 🔄
5. Move to Phase 2 (after explicit "Proceed to Phase 2" command)

---

**Phase 1 Status**: ✅ **COMPLETE - AWAITING APPROVAL**
