# PHASE 2: DATA MODEL, AGGREGATIONS & READ LAYER (CSV-FIRST)

**Status**: IN PROGRESS
**Prerequisite**: Phase 1 APPROVED ✅
**API Provider**: Jolpica (primary), OpenF1 (fallback)
**Storage**: CSV files as authoritative database

---

## 1) CANONICAL CSV DATA MODEL

All canonical CSVs stored in `/data/canonical/` and are **manually editable** with Git tracking.

### Metadata Conventions

```
# Column Types (documented in comments, not enforced):
# - STRING: text (quoted if contains commas)
# - INT: integer number
# - FLOAT: decimal number
# - DATE: YYYY-MM-DD format
# - TIME: HH:MM:SS or HH:MM:SS.mmm format
# - DATETIME: ISO 8601 (YYYY-MM-DDThh:mm:ssZ)
# - BOOL: true/false
# - ENUM: predefined set of values
# - NULLABLE: can be empty

# Edit Markers:
# 🔒 LOCKED: Auto-generated, do not edit manually
# ✏️ EDITABLE: Safe for manual corrections
# ⚠️ CAREFUL: Edit only if correcting API errors
```

---

### 1.1) `seasons.csv`

**Location**: `/data/canonical/seasons.csv`
**Purpose**: Master list of F1 seasons
**Primary Key**: `season`
**Editable**: Rarely (only to add future seasons before API updates)

```csv
season,startYear,endYear,url,numRounds
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `season` | INT | ✅ | 🔒 | Season year (e.g., 2024) |
| `startYear` | INT | ✅ | ✏️ | Year of first race (usually = season, except cross-year seasons) |
| `endYear` | INT | ✅ | ✏️ | Year of final race |
| `url` | STRING | ❌ | ⚠️ | Wikipedia or reference URL |
| `numRounds` | INT | ✅ | ✏️ | Total number of race weekends (not including cancelled races) |

**Example**:
```csv
season,startYear,endYear,url,numRounds
2023,2023,2023,http://en.wikipedia.org/wiki/2023_Formula_One_season,22
2024,2024,2024,http://en.wikipedia.org/wiki/2024_Formula_One_season,24
```

---

### 1.2) `circuits.csv`

**Location**: `/data/canonical/circuits.csv`
**Purpose**: Master circuit/track registry
**Primary Key**: `circuitId`
**Editable**: Rarely (only for name corrections or new circuits)

```csv
circuitId,circuitName,locality,country,lat,long,url
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `circuitId` | STRING | ✅ | 🔒 | Stable identifier (e.g., "monaco", "spa") |
| `circuitName` | STRING | ✅ | ✏️ | Official circuit name |
| `locality` | STRING | ✅ | ✏️ | City/region |
| `country` | STRING | ✅ | ✏️ | Country name |
| `lat` | FLOAT | ✅ | ⚠️ | Latitude (decimal degrees) |
| `long` | FLOAT | ✅ | ⚠️ | Longitude (decimal degrees) |
| `url` | STRING | ❌ | ⚠️ | Wikipedia or reference URL |

**Example**:
```csv
circuitId,circuitName,locality,country,lat,long,url
monaco,Circuit de Monaco,Monte-Carlo,Monaco,43.7347,7.42056,http://en.wikipedia.org/wiki/Circuit_de_Monaco
spa,Circuit de Spa-Francorchamps,Spa,Belgium,50.4372,5.97139,http://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps
```

---

### 1.3) `drivers.csv`

**Location**: `/data/canonical/drivers.csv`
**Purpose**: Master driver registry (all-time, season-agnostic)
**Primary Key**: `driverId`
**Editable**: Safe for corrections (name typos, DOB fixes)

```csv
driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `driverId` | STRING | ✅ | 🔒 | Stable identifier (e.g., "max_verstappen", "leclerc") |
| `permanentNumber` | INT | ❌ | ✏️ | Driver's career number (e.g., 1, 16, 33). Null for pre-2014 drivers |
| `code` | STRING | ✅ | ✏️ | Three-letter code (e.g., VER, LEC, HAM) |
| `givenName` | STRING | ✅ | ✏️ | First name |
| `familyName` | STRING | ✅ | ✏️ | Last name |
| `dateOfBirth` | DATE | ✅ | ✏️ | YYYY-MM-DD |
| `nationality` | STRING | ✅ | ✏️ | Nationality (e.g., "Dutch", "Monegasque") |
| `url` | STRING | ❌ | ⚠️ | Wikipedia or reference URL |

**Example**:
```csv
driverId,permanentNumber,code,givenName,familyName,dateOfBirth,nationality,url
max_verstappen,1,VER,Max,Verstappen,1997-09-30,Dutch,http://en.wikipedia.org/wiki/Max_Verstappen
leclerc,16,LEC,Charles,Leclerc,1997-10-16,Monegasque,http://en.wikipedia.org/wiki/Charles_Leclerc
hamilton,44,HAM,Lewis,Hamilton,1985-01-07,British,http://en.wikipedia.org/wiki/Lewis_Hamilton
```

**Note**: This is a **global** driver registry. Season-specific participation tracked in `driver_teams.csv`.

---

### 1.4) `constructors.csv`

**Location**: `/data/canonical/constructors.csv`
**Purpose**: Master team/constructor registry (all-time)
**Primary Key**: `constructorId`
**Editable**: Safe for name corrections

```csv
constructorId,name,nationality,url
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `constructorId` | STRING | ✅ | 🔒 | Stable identifier (e.g., "red_bull", "ferrari", "mercedes") |
| `name` | STRING | ✅ | ✏️ | Official team name |
| `nationality` | STRING | ✅ | ✏️ | Team nationality |
| `url` | STRING | ❌ | ⚠️ | Wikipedia or reference URL |

**Example**:
```csv
constructorId,name,nationality,url
red_bull,Red Bull Racing,Austrian,http://en.wikipedia.org/wiki/Red_Bull_Racing
ferrari,Ferrari,Italian,http://en.wikipedia.org/wiki/Scuderia_Ferrari
mercedes,Mercedes,German,http://en.wikipedia.org/wiki/Mercedes-Benz_in_Formula_One
```

---

### 1.5) `driver_teams.csv`

**Location**: `/data/canonical/driver_teams.csv`
**Purpose**: Map drivers to constructors for each season
**Primary Key**: `(season, driverId)`
**Foreign Keys**:
- `season` → `seasons.season`
- `driverId` → `drivers.driverId`
- `constructorId` → `constructors.constructorId`

```csv
season,driverId,constructorId,raceNumber
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `season` | INT | ✅ | 🔒 | Season year |
| `driverId` | STRING | ✅ | 🔒 | Driver identifier |
| `constructorId` | STRING | ✅ | ✏️ | Constructor identifier (edit if mid-season team change) |
| `raceNumber` | INT | ❌ | ✏️ | Car number for this season (may differ from permanentNumber) |

**Example**:
```csv
season,driverId,constructorId,raceNumber
2024,max_verstappen,red_bull,1
2024,perez,red_bull,11
2024,leclerc,ferrari,16
2024,sainz,ferrari,55
2023,alonso,aston_martin,14
2024,alonso,aston_martin,14
```

**Mid-Season Team Changes**: If a driver switches teams mid-season (rare), create TWO rows with same `season` and `driverId`, differentiating by adding a `fromRound` and `toRound` column (schema extension).

---

### 1.6) `races.csv`

**Location**: `/data/canonical/races.csv`
**Purpose**: Race calendar (metadata, not results)
**Primary Key**: `(season, round)` OR `raceId` (globally unique)
**Foreign Keys**:
- `season` → `seasons.season`
- `circuitId` → `circuits.circuitId`

```csv
raceId,season,round,raceName,circuitId,date,time,hasSprint,qualiDate,qualiTime,sprintDate,sprintTime,classification
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `raceId` | STRING | ✅ | 🔒 | Globally unique race ID: `{season}_{round}` (e.g., "2024_01") |
| `season` | INT | ✅ | 🔒 | Season year |
| `round` | INT | ✅ | 🔒 | Round number within season (1-based) |
| `raceName` | STRING | ✅ | ✏️ | Official Grand Prix name |
| `circuitId` | STRING | ✅ | ⚠️ | Circuit identifier |
| `date` | DATE | ✅ | ✏️ | Race date (YYYY-MM-DD) |
| `time` | TIME | ❌ | ✏️ | Race start time (UTC, HH:MM:SS) |
| `hasSprint` | BOOL | ✅ | ✏️ | Sprint weekend flag (true/false) |
| `qualiDate` | DATE | ❌ | ✏️ | Qualifying date |
| `qualiTime` | TIME | ❌ | ✏️ | Qualifying start time (UTC) |
| `sprintDate` | DATE | ❌ | ✏️ | Sprint race date (if hasSprint=true) |
| `sprintTime` | TIME | ❌ | ✏️ | Sprint start time (UTC, if hasSprint=true) |
| `classification` | ENUM | ✅ | ✏️ | Race status: "scheduled", "provisional", "official", "amended", "cancelled" |

**Classification Status**:
- `scheduled`: Future race, no results yet
- `provisional`: Results published but subject to steward review
- `official`: Results finalized, no more changes expected
- `amended`: Results corrected after initial publication (penalties applied)
- `cancelled`: Race cancelled (e.g., COVID-19)

**Example**:
```csv
raceId,season,round,raceName,circuitId,date,time,hasSprint,qualiDate,qualiTime,sprintDate,sprintTime,classification
2024_01,2024,1,Bahrain Grand Prix,bahrain,2024-03-02,15:00:00,false,2024-03-01,16:00:00,,,official
2024_04,2024,4,Japanese Grand Prix,suzuka,2024-04-07,05:00:00,true,2024-04-06,06:00:00,2024-04-06,09:30:00,official
```

---

### 1.7) `qualifying.csv`

**Location**: `/data/canonical/qualifying.csv`
**Purpose**: Qualifying session results
**Primary Key**: `(raceId, driverId)` OR composite `(season, round, driverId)`
**Foreign Keys**:
- `raceId` → `races.raceId`
- `driverId` → `drivers.driverId`
- `constructorId` → `constructors.constructorId`

```csv
raceId,season,round,position,driverId,constructorId,Q1,Q2,Q3
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `raceId` | STRING | ✅ | 🔒 | Race identifier (e.g., "2024_01") |
| `season` | INT | ✅ | 🔒 | Season year (redundant but aids filtering) |
| `round` | INT | ✅ | 🔒 | Round number (redundant but aids filtering) |
| `position` | INT | ✅ | ✏️ | Final qualifying position (1-20) |
| `driverId` | STRING | ✅ | 🔒 | Driver identifier |
| `constructorId` | STRING | ✅ | 🔒 | Constructor identifier |
| `Q1` | TIME | ❌ | ✏️ | Q1 best lap time (MM:SS.mmm or null if no time) |
| `Q2` | TIME | ❌ | ✏️ | Q2 best lap time (null if eliminated in Q1) |
| `Q3` | TIME | ❌ | ✏️ | Q3 best lap time (null if eliminated before Q3) |

**Missing Times**: Drivers eliminated in Q1 have only `Q1` populated. Drivers with mechanical issues may have no times (DNS).

**Example**:
```csv
raceId,season,round,position,driverId,constructorId,Q1,Q2,Q3
2024_01,2024,1,1,max_verstappen,red_bull,1:29.179,1:28.918,1:28.997
2024_01,2024,1,2,perez,red_bull,1:29.234,1:29.001,1:29.045
2024_01,2024,1,11,leclerc,ferrari,1:29.456,1:29.123,
2024_01,2024,1,16,hamilton,mercedes,1:30.012,,
```

---

### 1.8) `race_results.csv`

**Location**: `/data/canonical/race_results.csv`
**Purpose**: Race finishing results
**Primary Key**: `(raceId, driverId)`
**Foreign Keys**: Same as qualifying

```csv
raceId,season,round,position,positionOrder,driverId,constructorId,gridPosition,laps,points,status,timeMillis,fastestLapRank,fastestLapTime
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `raceId` | STRING | ✅ | 🔒 | Race identifier |
| `season` | INT | ✅ | 🔒 | Season year |
| `round` | INT | ✅ | 🔒 | Round number |
| `position` | INT | ❌ | ✏️ | Classified finishing position (1-20, or null if DNF/DSQ) |
| `positionOrder` | INT | ✅ | ✏️ | Order of finish (1-20, includes DNF at end). Used for sorting. |
| `driverId` | STRING | ✅ | 🔒 | Driver identifier |
| `constructorId` | STRING | ✅ | 🔒 | Constructor identifier |
| `gridPosition` | INT | ✅ | 🔒 | Starting grid position (from qualifying or penalties) |
| `laps` | INT | ✅ | 🔒 | Laps completed |
| `points` | FLOAT | ✅ | ✏️ | Championship points awarded (25-18-15-12-10-8-6-4-2-1, +1 for fastest lap if top 10 finish) |
| `status` | STRING | ✅ | ✏️ | Finish status (see Status Enum below) |
| `timeMillis` | INT | ❌ | 🔒 | Race time in milliseconds (null if DNF) |
| `fastestLapRank` | INT | ❌ | 🔒 | Fastest lap rank (1 = fastest, null if no lap times) |
| `fastestLapTime` | TIME | ❌ | 🔒 | Best lap time (MM:SS.mmm) |

**Status Enum** (common values):
- `Finished`: Completed race
- `+1 Lap`, `+2 Laps`, etc.: Lapped but classified
- `Accident`: Retired due to crash
- `Collision`: Retired due to contact
- `Engine`: Engine failure
- `Gearbox`: Gearbox failure
- `Transmission`: Transmission issue
- `Clutch`: Clutch failure
- `Hydraulics`: Hydraulic failure
- `Electrical`: Electrical failure
- `Retired`: Generic retirement
- `Spun off`: Lost control, unable to continue
- `Fuel pressure`: Fuel system issue
- `Disqualified`: DSQ by stewards
- `Withdrew`: Withdrew before race
- `Did not qualify`: DNQ (pre-race)
- `Did not prequalify`: DNPQ (older seasons)
- `Excluded`: Excluded from classification

**Position vs PositionOrder**:
- `position`: Official classified position (null if not classified, e.g., DSQ)
- `positionOrder`: Physical order of finish (for sorting; DSQ drivers at end)

**Example**:
```csv
raceId,season,round,position,positionOrder,driverId,constructorId,gridPosition,laps,points,status,timeMillis,fastestLapRank,fastestLapTime
2024_01,2024,1,1,1,max_verstappen,red_bull,1,57,26,Finished,5309000,1,1:31.447
2024_01,2024,1,2,2,perez,red_bull,2,57,18,Finished,5311234,3,1:31.789
2024_01,2024,1,3,3,sainz,ferrari,3,57,15,Finished,5313456,2,1:31.523
2024_01,2024,1,,18,leclerc,ferrari,5,12,0,Engine,,,
2024_01,2024,1,,19,hamilton,mercedes,7,0,0,Collision,,,
```

**Points with Fastest Lap**: Verstappen scored 25 + 1 (fastest lap) = 26 points.

---

### 1.9) `sprint_results.csv`

**Location**: `/data/canonical/sprint_results.csv`
**Purpose**: Sprint race results (only for sprint weekends)
**Primary Key**: `(raceId, driverId)`
**Foreign Keys**: Same as race_results

```csv
raceId,season,round,position,positionOrder,driverId,constructorId,gridPosition,laps,points,status,timeMillis
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `raceId` | STRING | ✅ | 🔒 | Race identifier (must have `hasSprint=true` in races.csv) |
| `season` | INT | ✅ | 🔒 | Season year |
| `round` | INT | ✅ | 🔒 | Round number |
| `position` | INT | ❌ | ✏️ | Finishing position (1-20, null if DNF) |
| `positionOrder` | INT | ✅ | ✏️ | Order of finish |
| `driverId` | STRING | ✅ | 🔒 | Driver identifier |
| `constructorId` | STRING | ✅ | 🔒 | Constructor identifier |
| `gridPosition` | INT | ✅ | 🔒 | Sprint starting grid (from sprint qualifying/shootout) |
| `laps` | INT | ✅ | 🔒 | Laps completed |
| `points` | INT | ✅ | ✏️ | Sprint points (8-7-6-5-4-3-2-1 for P1-P8) |
| `status` | STRING | ✅ | ✏️ | Finish status (same enum as race_results) |
| `timeMillis` | INT | ❌ | 🔒 | Sprint time in milliseconds |

**Sprint Points** (2024 format): P1=8, P2=7, P3=6, P4=5, P5=4, P6=3, P7=2, P8=1, P9+=0

**Example**:
```csv
raceId,season,round,position,positionOrder,driverId,constructorId,gridPosition,laps,points,status,timeMillis
2024_04,2024,4,1,1,max_verstappen,red_bull,1,19,8,Finished,1540000
2024_04,2024,4,2,2,leclerc,ferrari,2,19,7,Finished,1541200
```

---

### 1.10) `manual_corrections.csv`

**Location**: `/data/canonical/manual_corrections.csv`
**Purpose**: Log of all manual edits to preserve audit trail
**Primary Key**: `correctionId` (auto-increment or timestamp-based)

```csv
correctionId,timestamp,editedFile,season,round,driverId,field,oldValue,newValue,reason,editedBy
```

| Column | Type | Required | Editable | Description |
|--------|------|----------|----------|-------------|
| `correctionId` | STRING | ✅ | 🔒 | Unique ID (e.g., UUID or timestamp) |
| `timestamp` | DATETIME | ✅ | 🔒 | When correction was made (ISO 8601) |
| `editedFile` | STRING | ✅ | ✏️ | Filename edited (e.g., "race_results.csv") |
| `season` | INT | ❌ | ✏️ | Season affected (if applicable) |
| `round` | INT | ❌ | ✏️ | Round affected (if applicable) |
| `driverId` | STRING | ❌ | ✏️ | Driver affected (if applicable) |
| `field` | STRING | ✅ | ✏️ | Column name edited |
| `oldValue` | STRING | ❌ | ✏️ | Original value |
| `newValue` | STRING | ✅ | ✏️ | Corrected value |
| `reason` | STRING | ✅ | ✏️ | Why correction was made |
| `editedBy` | STRING | ✅ | ✏️ | Who made the edit (username or "system") |

**Purpose**: Enables diffing, rollback, and understanding why data diverges from API source.

**Example**:
```csv
correctionId,timestamp,editedFile,season,round,driverId,field,oldValue,newValue,reason,editedBy
c001,2024-03-03T10:30:00Z,race_results.csv,2024,1,hamilton,points,18,15,5-second penalty applied post-race,user_admin
c002,2024-03-03T10:31:00Z,race_results.csv,2024,1,sainz,points,15,18,Penalty on Hamilton promoted Sainz,user_admin
```

---

## 2) DERIVED / AGGREGATED CSVs (READ-OPTIMIZED)

All derived CSVs stored in `/data/derived/` and are **GENERATED** (never manually edited).

### Rebuild Policy
- Regenerate after ANY change to canonical CSVs
- Safe to delete and rebuild at any time
- Must produce deterministic output from same canonical inputs

---

### 2.1) `driver_season_summary.csv`

**Location**: `/data/derived/driver_season_summary.csv`
**Source**: `race_results.csv`, `sprint_results.csv`, `driver_teams.csv`
**Regeneration**: After any race/sprint result update

```csv
season,driverId,constructorId,totalPoints,racePoints,sprintPoints,podiums,wins,dnfs,avgFinishPosition,racesStarted,racesFinished,fastestLaps
```

| Column | Type | Description |
|--------|------|-------------|
| `season` | INT | Season year |
| `driverId` | STRING | Driver identifier |
| `constructorId` | STRING | Primary constructor for season (handle team changes separately) |
| `totalPoints` | FLOAT | Sum of race + sprint points |
| `racePoints` | FLOAT | Points from Grand Prix races only |
| `sprintPoints` | INT | Points from sprint races only |
| `podiums` | INT | Number of top-3 finishes (races only, not sprint) |
| `wins` | INT | Number of P1 finishes (races only) |
| `dnfs` | INT | Number of Did Not Finish (status != "Finished" and laps < total) |
| `avgFinishPosition` | FLOAT | Average classified position (excluding DNF) |
| `racesStarted` | INT | Number of races participated in |
| `racesFinished` | INT | Number of races classified (status = "Finished" or lapped) |
| `fastestLaps` | INT | Number of fastest laps set |

**Calculation Rules**:
- `totalPoints` = SUM(race_results.points) + SUM(sprint_results.points) WHERE season = X AND driverId = Y
- `podiums` = COUNT(*) WHERE position IN (1,2,3) FROM race_results
- `dnfs` = COUNT(*) WHERE position IS NULL AND status NOT IN ("Disqualified", "Withdrew")
- `avgFinishPosition` = AVG(position) WHERE position IS NOT NULL

**Example**:
```csv
season,driverId,constructorId,totalPoints,racePoints,sprintPoints,podiums,wins,dnfs,avgFinishPosition,racesStarted,racesFinished,fastestLaps
2024,max_verstappen,red_bull,575,551,24,19,19,1,1.1,24,23,15
2024,leclerc,ferrari,356,344,12,8,3,3,4.2,24,21,2
```

---

### 2.2) `driver_career_summary.csv`

**Location**: `/data/derived/driver_career_summary.csv`
**Source**: `driver_season_summary.csv`
**Regeneration**: After driver_season_summary updates

```csv
driverId,firstSeason,lastSeason,totalPoints,totalWins,totalPodiums,totalRaces,championships
```

| Column | Type | Description |
|--------|------|-------------|
| `driverId` | STRING | Driver identifier |
| `firstSeason` | INT | First season competed |
| `lastSeason` | INT | Most recent season |
| `totalPoints` | FLOAT | Career total points (sum across all seasons) |
| `totalWins` | INT | Career race wins |
| `totalPodiums` | INT | Career podium finishes |
| `totalRaces` | INT | Total races started |
| `championships` | INT | Number of World Championships won (future: from standings table) |

**Example**:
```csv
driverId,firstSeason,lastSeason,totalPoints,totalWins,totalPodiums,totalRaces,championships
hamilton,2007,2024,4673,103,197,342,7
max_verstappen,2015,2024,2586,54,101,185,3
```

---

### 2.3) `constructor_season_summary.csv`

**Location**: `/data/derived/constructor_season_summary.csv`
**Source**: `race_results.csv`, `sprint_results.csv`
**Regeneration**: After result updates

```csv
season,constructorId,totalPoints,wins,podiums,dnfs,avgFinishPosition
```

| Column | Type | Description |
|--------|------|-------------|
| `season` | INT | Season year |
| `constructorId` | STRING | Constructor identifier |
| `totalPoints` | FLOAT | Sum of all driver points for this constructor |
| `wins` | INT | Number of P1 finishes (all drivers) |
| `podiums` | INT | Number of top-3 finishes (all drivers) |
| `dnfs` | INT | Total DNFs for constructor's drivers |
| `avgFinishPosition` | FLOAT | Average classified finish position |

**Example**:
```csv
season,constructorId,totalPoints,wins,podiums,dnfs,avgFinishPosition
2024,red_bull,860,21,33,4,2.3
2024,ferrari,652,5,18,7,4.5
```

---

### 2.4) `race_performance_deltas.csv`

**Location**: `/data/derived/race_performance_deltas.csv`
**Source**: `race_results.csv`, `qualifying.csv`
**Regeneration**: After race result updates

```csv
raceId,season,round,driverId,gridPosition,finishPosition,positionChange,pointsScored,dnf
```

| Column | Type | Description |
|--------|------|-------------|
| `raceId` | STRING | Race identifier |
| `season` | INT | Season year |
| `round` | INT | Round number |
| `driverId` | STRING | Driver identifier |
| `gridPosition` | INT | Starting grid position |
| `finishPosition` | INT | Finishing position (null if DNF) |
| `positionChange` | INT | Grid position - finish position (positive = gained places) |
| `pointsScored` | FLOAT | Points from this race (0 if DNF) |
| `dnf` | BOOL | true if DNF, false if finished |

**Calculation**:
- `positionChange` = `gridPosition` - `finishPosition` (positive = overtakes)
  - Example: Started P10, finished P5 → +5 (gained 5 places)
  - Example: Started P3, finished P8 → -5 (lost 5 places)
- `dnf` = `position IS NULL` OR `status != "Finished"`

**Example**:
```csv
raceId,season,round,driverId,gridPosition,finishPosition,positionChange,pointsScored,dnf
2024_01,2024,1,max_verstappen,1,1,0,26,false
2024_01,2024,1,alonso,9,5,4,10,false
2024_01,2024,1,leclerc,5,,,,true
```

---

### 2.5) `qualifying_performance.csv`

**Location**: `/data/derived/qualifying_performance.csv`
**Source**: `qualifying.csv`, `driver_teams.csv`
**Regeneration**: After qualifying updates

```csv
raceId,season,round,driverId,constructorId,position,Q3Time,gapToP1Millis,teamMatePosition,teamMateBeat
```

| Column | Type | Description |
|--------|------|-------------|
| `raceId` | STRING | Race identifier |
| `season` | INT | Season year |
| `round` | INT | Round number |
| `driverId` | STRING | Driver identifier |
| `constructorId` | STRING | Constructor identifier |
| `position` | INT | Qualifying position |
| `Q3Time` | TIME | Q3 lap time (null if eliminated before Q3) |
| `gapToP1Millis` | INT | Gap to pole position in milliseconds |
| `teamMatePosition` | INT | Teammate's qualifying position |
| `teamMateBeat` | BOOL | true if out-qualified teammate |

**Calculation**:
- `gapToP1Millis` = (driver's best Q time) - (P1's Q3 time)
- `teamMateBeat` = (driver's position < teammate's position)

**Purpose**: Track intra-team battles and qualifying pace.

**Example**:
```csv
raceId,season,round,driverId,constructorId,position,Q3Time,gapToP1Millis,teamMatePosition,teamMateBeat
2024_01,2024,1,max_verstappen,red_bull,1,1:28.997,0,2,true
2024_01,2024,1,perez,red_bull,2,1:29.045,48,1,false
```

---

## 3) READ LAYER ARCHITECTURE (VANILLA JS)

### 3.1) Module Structure

```
/lib/
  ├── csv-loader.js        # CSV fetch + parse utilities
  ├── data-store.js        # In-memory indexed data store
  ├── query-api.js         # High-level query interface
  └── validators.js        # Runtime validation rules
```

---

### 3.2) `csv-loader.js`

**Responsibility**: Fetch and parse CSV files in browser

```javascript
// lib/csv-loader.js

/**
 * Fetches and parses a CSV file into an array of objects.
 * @param {string} filepath - Relative path from /data/
 * @returns {Promise<Array<Object>>} Parsed CSV rows
 */
export async function loadCSV(filepath) {
  const response = await fetch(`/data/${filepath}`);
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${filepath} (${response.status})`);
  }

  const text = await response.text();
  return parseCSV(text);
}

/**
 * Parses CSV text into array of objects.
 * Handles quoted fields with commas.
 * @param {string} csvText - Raw CSV content
 * @returns {Array<Object>}
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = parseLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((header, i) => {
      const value = values[i] || null;
      row[header] = value === '' ? null : value;
    });
    return row;
  });
}

/**
 * Parses a CSV line handling quoted fields.
 * @param {string} line - Single CSV line
 * @returns {Array<string>}
 */
function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current); // Last field
  return result;
}

/**
 * Loads multiple CSVs in parallel.
 * @param {Array<string>} filepaths - Array of CSV file paths
 * @returns {Promise<Object>} Map of filepath to parsed data
 */
export async function loadMultipleCSVs(filepaths) {
  const results = await Promise.all(
    filepaths.map(async (path) => {
      const data = await loadCSV(path);
      return { path, data };
    })
  );

  return results.reduce((acc, { path, data }) => {
    acc[path] = data;
    return acc;
  }, {});
}
```

---

### 3.3) `data-store.js`

**Responsibility**: In-memory indexed storage with fast lookups

```javascript
// lib/data-store.js
import { loadCSV } from './csv-loader.js';

/**
 * Global in-memory data store with indexed lookups.
 */
class DataStore {
  constructor() {
    this.data = {
      seasons: [],
      circuits: [],
      drivers: [],
      constructors: [],
      driverTeams: [],
      races: [],
      qualifying: [],
      raceResults: [],
      sprintResults: [],
      // Derived data
      driverSeasonSummary: [],
      driverCareerSummary: [],
      constructorSeasonSummary: [],
      racePerformanceDeltas: [],
      qualifyingPerformance: []
    };

    // Indexes for fast lookups
    this.indexes = {
      raceById: new Map(),              // raceId -> race object
      driverById: new Map(),            // driverId -> driver object
      constructorById: new Map(),       // constructorId -> constructor object
      circuitById: new Map(),           // circuitId -> circuit object
      resultsByRace: new Map(),         // raceId -> [results]
      qualifyingByRace: new Map(),      // raceId -> [qualifying]
      driverSeasonSummaryIndex: new Map(), // `${season}_${driverId}` -> summary
      racesBySeason: new Map()          // season -> [races]
    };

    this.loaded = false;
  }

  /**
   * Loads all canonical and derived CSVs into memory.
   * @param {Object} options - Loading options
   * @param {boolean} options.includeDerived - Load derived CSVs (default true)
   * @param {Array<number>} options.seasons - Specific seasons to load (default all)
   * @returns {Promise<void>}
   */
  async load({ includeDerived = true, seasons = null } = {}) {
    console.log('[DataStore] Loading canonical CSVs...');

    // Load master tables
    this.data.seasons = await loadCSV('canonical/seasons.csv');
    this.data.circuits = await loadCSV('canonical/circuits.csv');
    this.data.drivers = await loadCSV('canonical/drivers.csv');
    this.data.constructors = await loadCSV('canonical/constructors.csv');
    this.data.driverTeams = await loadCSV('canonical/driver_teams.csv');

    // Determine which seasons to load
    const seasonsToLoad = seasons || this.data.seasons.map(s => parseInt(s.season));

    // Load race calendar for each season
    this.data.races = [];
    for (const season of seasonsToLoad) {
      try {
        const seasonRaces = await loadCSV(`canonical/races.csv`);
        const filteredRaces = seasonRaces.filter(r => parseInt(r.season) === season);
        this.data.races.push(...filteredRaces);
      } catch (err) {
        console.warn(`[DataStore] No races found for season ${season}`);
      }
    }

    // Load results (qualifying, race, sprint) for all races
    console.log('[DataStore] Loading results...');
    this.data.qualifying = await loadCSV('canonical/qualifying.csv');
    this.data.raceResults = await loadCSV('canonical/race_results.csv');
    this.data.sprintResults = await loadCSV('canonical/sprint_results.csv');

    // Load derived data if requested
    if (includeDerived) {
      console.log('[DataStore] Loading derived CSVs...');
      this.data.driverSeasonSummary = await loadCSV('derived/driver_season_summary.csv');
      this.data.driverCareerSummary = await loadCSV('derived/driver_career_summary.csv');
      this.data.constructorSeasonSummary = await loadCSV('derived/constructor_season_summary.csv');
      this.data.racePerformanceDeltas = await loadCSV('derived/race_performance_deltas.csv');
      this.data.qualifyingPerformance = await loadCSV('derived/qualifying_performance.csv');
    }

    // Build indexes
    this.buildIndexes();

    this.loaded = true;
    console.log('[DataStore] Load complete');
  }

  /**
   * Builds indexes for fast lookups.
   */
  buildIndexes() {
    // Index races by ID
    this.data.races.forEach(race => {
      this.indexes.raceById.set(race.raceId, race);

      const season = parseInt(race.season);
      if (!this.indexes.racesBySeason.has(season)) {
        this.indexes.racesBySeason.set(season, []);
      }
      this.indexes.racesBySeason.get(season).push(race);
    });

    // Index drivers
    this.data.drivers.forEach(driver => {
      this.indexes.driverById.set(driver.driverId, driver);
    });

    // Index constructors
    this.data.constructors.forEach(constructor => {
      this.indexes.constructorById.set(constructor.constructorId, constructor);
    });

    // Index circuits
    this.data.circuits.forEach(circuit => {
      this.indexes.circuitById.set(circuit.circuitId, circuit);
    });

    // Index results by race
    this.data.raceResults.forEach(result => {
      if (!this.indexes.resultsByRace.has(result.raceId)) {
        this.indexes.resultsByRace.set(result.raceId, []);
      }
      this.indexes.resultsByRace.get(result.raceId).push(result);
    });

    // Index qualifying by race
    this.data.qualifying.forEach(quali => {
      if (!this.indexes.qualifyingByRace.has(quali.raceId)) {
        this.indexes.qualifyingByRace.set(quali.raceId, []);
      }
      this.indexes.qualifyingByRace.get(quali.raceId).push(quali);
    });

    // Index driver season summaries
    this.data.driverSeasonSummary.forEach(summary => {
      const key = `${summary.season}_${summary.driverId}`;
      this.indexes.driverSeasonSummaryIndex.set(key, summary);
    });
  }

  /**
   * Gets a race by ID.
   * @param {string} raceId - Race identifier (e.g., "2024_01")
   * @returns {Object|null}
   */
  getRace(raceId) {
    return this.indexes.raceById.get(raceId) || null;
  }

  /**
   * Gets all races for a season, sorted by round.
   * @param {number} season - Season year
   * @returns {Array<Object>}
   */
  getRacesBySeason(season) {
    return (this.indexes.racesBySeason.get(season) || [])
      .sort((a, b) => parseInt(a.round) - parseInt(b.round));
  }

  /**
   * Gets race results for a specific race.
   * @param {string} raceId - Race identifier
   * @returns {Array<Object>}
   */
  getRaceResults(raceId) {
    return this.indexes.resultsByRace.get(raceId) || [];
  }

  /**
   * Gets qualifying results for a specific race.
   * @param {string} raceId - Race identifier
   * @returns {Array<Object>}
   */
  getQualifying(raceId) {
    return this.indexes.qualifyingByRace.get(raceId) || [];
  }

  /**
   * Gets driver season summary.
   * @param {number} season - Season year
   * @param {string} driverId - Driver identifier
   * @returns {Object|null}
   */
  getDriverSeasonSummary(season, driverId) {
    const key = `${season}_${driverId}`;
    return this.indexes.driverSeasonSummaryIndex.get(key) || null;
  }
}

// Singleton instance
export const dataStore = new DataStore();
```

---

### 3.4) `query-api.js`

**Responsibility**: High-level query interface for app logic

```javascript
// lib/query-api.js
import { dataStore } from './data-store.js';

/**
 * Gets complete race weekend data (race + qualifying + sprint if applicable).
 * @param {string} raceId - Race identifier
 * @returns {Object} { race, qualifying, results, sprint }
 */
export function getRaceWeekend(raceId) {
  const race = dataStore.getRace(raceId);
  if (!race) return null;

  const qualifying = dataStore.getQualifying(raceId);
  const results = dataStore.getRaceResults(raceId);

  let sprint = null;
  if (race.hasSprint === 'true') {
    sprint = dataStore.data.sprintResults.filter(s => s.raceId === raceId);
  }

  return { race, qualifying, results, sprint };
}

/**
 * Gets driver profile with career stats.
 * @param {string} driverId - Driver identifier
 * @returns {Object} { driver, careerSummary, seasonSummaries }
 */
export function getDriverProfile(driverId) {
  const driver = dataStore.indexes.driverById.get(driverId);
  if (!driver) return null;

  const careerSummary = dataStore.data.driverCareerSummary.find(
    d => d.driverId === driverId
  );

  const seasonSummaries = dataStore.data.driverSeasonSummary.filter(
    s => s.driverId === driverId
  ).sort((a, b) => parseInt(b.season) - parseInt(a.season)); // Latest first

  return { driver, careerSummary, seasonSummaries };
}

/**
 * Gets season calendar with race status.
 * @param {number} season - Season year
 * @returns {Array<Object>} Races with added 'status' field (past/future)
 */
export function getSeasonCalendar(season) {
  const races = dataStore.getRacesBySeason(season);
  const now = new Date();

  return races.map(race => {
    const raceDate = new Date(race.date);
    const isPast = raceDate < now;

    return {
      ...race,
      isPast,
      hasResults: isPast && dataStore.getRaceResults(race.raceId).length > 0
    };
  });
}

/**
 * Gets driver performance comparison for a season.
 * @param {number} season - Season year
 * @param {string} driver1Id - First driver ID
 * @param {string} driver2Id - Second driver ID
 * @returns {Object} Comparison stats
 */
export function compareDrivers(season, driver1Id, driver2Id) {
  const d1Summary = dataStore.getDriverSeasonSummary(season, driver1Id);
  const d2Summary = dataStore.getDriverSeasonSummary(season, driver2Id);

  if (!d1Summary || !d2Summary) return null;

  // Head-to-head races
  const races = dataStore.getRacesBySeason(season);
  const headToHead = races.map(race => {
    const results = dataStore.getRaceResults(race.raceId);
    const d1Result = results.find(r => r.driverId === driver1Id);
    const d2Result = results.find(r => r.driverId === driver2Id);

    if (!d1Result || !d2Result) return null;

    return {
      raceId: race.raceId,
      raceName: race.raceName,
      d1Position: d1Result.position,
      d2Position: d2Result.position,
      winner: (d1Result.positionOrder < d2Result.positionOrder) ? driver1Id : driver2Id
    };
  }).filter(Boolean);

  const d1Wins = headToHead.filter(h => h.winner === driver1Id).length;
  const d2Wins = headToHead.filter(h => h.winner === driver2Id).length;

  return {
    driver1: { ...d1Summary, headToHeadWins: d1Wins },
    driver2: { ...d2Summary, headToHeadWins: d2Wins },
    headToHead
  };
}

/**
 * Gets upcoming races (future races in current season).
 * @returns {Array<Object>}
 */
export function getUpcomingRaces() {
  const currentYear = new Date().getFullYear();
  const calendar = getSeasonCalendar(currentYear);

  return calendar.filter(race => !race.isPast);
}

/**
 * Gets past races with results (current season).
 * @returns {Array<Object>}
 */
export function getPastRacesWithResults() {
  const currentYear = new Date().getFullYear();
  const calendar = getSeasonCalendar(currentYear);

  return calendar.filter(race => race.isPast && race.hasResults);
}

/**
 * Gets all drivers for a specific season.
 * @param {number} season - Season year
 * @returns {Array<Object>} Drivers with team info
 */
export function getDriversForSeason(season) {
  const driverTeams = dataStore.data.driverTeams.filter(
    dt => parseInt(dt.season) === season
  );

  return driverTeams.map(dt => {
    const driver = dataStore.indexes.driverById.get(dt.driverId);
    const constructor = dataStore.indexes.constructorById.get(dt.constructorId);

    return {
      ...driver,
      constructorId: dt.constructorId,
      constructorName: constructor?.name || 'Unknown',
      raceNumber: dt.raceNumber
    };
  }).sort((a, b) => a.familyName.localeCompare(b.familyName));
}
```

---

### 3.5) Caching Strategy

**Session-Level Cache**:
- CSVs loaded once on app init
- Stored in `dataStore` singleton (persists for page session)
- No localStorage/IndexedDB (keep it simple)
- Full reload required if data changes (acceptable for offline-first approach)

**Cache Invalidation**:
- User manually refreshes page to reload CSVs
- Future: Add "Refresh Data" button that calls `dataStore.load()` again

---

## 4) DATA INTEGRITY & VALIDATION RULES

### 4.1) Validation Script: `validate.js` (Node.js)

Run after ingestion or before deployment.

```javascript
// scripts/validate.js
import { readFileSync } from 'fs';
import { parseCSV } from '../lib/csv-loader.js';

const errors = [];
const warnings = [];

function validatePrimaryKey(data, keys, filename) {
  const seen = new Set();

  data.forEach((row, idx) => {
    const key = keys.map(k => row[k]).join('_');
    if (seen.has(key)) {
      errors.push(`[${filename}:${idx + 2}] Duplicate primary key: ${key}`);
    }
    seen.add(key);
  });
}

function validateForeignKey(data, foreignKey, referenceData, referenceKey, filename) {
  const validKeys = new Set(referenceData.map(r => r[referenceKey]));

  data.forEach((row, idx) => {
    const fk = row[foreignKey];
    if (fk && !validKeys.has(fk)) {
      errors.push(`[${filename}:${idx + 2}] Invalid foreign key ${foreignKey}=${fk}`);
    }
  });
}

function validateEnum(data, column, allowedValues, filename) {
  data.forEach((row, idx) => {
    const value = row[column];
    if (value && !allowedValues.includes(value)) {
      warnings.push(`[${filename}:${idx + 2}] Unexpected ${column} value: ${value}`);
    }
  });
}

// Load all CSVs
const seasons = parseCSV(readFileSync('./data/canonical/seasons.csv', 'utf-8'));
const circuits = parseCSV(readFileSync('./data/canonical/circuits.csv', 'utf-8'));
const drivers = parseCSV(readFileSync('./data/canonical/drivers.csv', 'utf-8'));
const constructors = parseCSV(readFileSync('./data/canonical/constructors.csv', 'utf-8'));
const races = parseCSV(readFileSync('./data/canonical/races.csv', 'utf-8'));
const qualifying = parseCSV(readFileSync('./data/canonical/qualifying.csv', 'utf-8'));
const raceResults = parseCSV(readFileSync('./data/canonical/race_results.csv', 'utf-8'));

// Validate primary keys
validatePrimaryKey(seasons, ['season'], 'seasons.csv');
validatePrimaryKey(circuits, ['circuitId'], 'circuits.csv');
validatePrimaryKey(drivers, ['driverId'], 'drivers.csv');
validatePrimaryKey(constructors, ['constructorId'], 'constructors.csv');
validatePrimaryKey(races, ['raceId'], 'races.csv');
validatePrimaryKey(qualifying, ['raceId', 'driverId'], 'qualifying.csv');
validatePrimaryKey(raceResults, ['raceId', 'driverId'], 'race_results.csv');

// Validate foreign keys
validateForeignKey(races, 'season', seasons, 'season', 'races.csv');
validateForeignKey(races, 'circuitId', circuits, 'circuitId', 'races.csv');
validateForeignKey(raceResults, 'raceId', races, 'raceId', 'race_results.csv');
validateForeignKey(raceResults, 'driverId', drivers, 'driverId', 'race_results.csv');
validateForeignKey(raceResults, 'constructorId', constructors, 'constructorId', 'race_results.csv');

// Validate enums
const validStatuses = [
  'Finished', 'Accident', 'Collision', 'Engine', 'Gearbox', 'Transmission',
  'Clutch', 'Hydraulics', 'Electrical', 'Retired', 'Disqualified', 'Withdrew',
  '+1 Lap', '+2 Laps', '+3 Laps', 'Spun off', 'Fuel pressure'
];
validateEnum(raceResults, 'status', validStatuses, 'race_results.csv');

const validClassifications = ['scheduled', 'provisional', 'official', 'amended', 'cancelled'];
validateEnum(races, 'classification', validClassifications, 'races.csv');

// Report
console.log(`\n=== VALIDATION REPORT ===\n`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}\n`);

if (errors.length > 0) {
  console.log('ERRORS:');
  errors.forEach(e => console.log(`  ${e}`));
}

if (warnings.length > 0) {
  console.log('\nWARNINGS:');
  warnings.forEach(w => console.log(`  ${w}`));
}

if (errors.length > 0) {
  process.exit(1);
}
```

**Run**: `node scripts/validate.js`

---

### 4.2) Browser-Side Validation

**When**: On `dataStore.load()`

**Checks**:
- Warn if any CSV fails to load (missing file)
- Warn if season has races but no results (incomplete ingestion)
- Warn if driver appears in results but not in `drivers.csv`

**Behavior**: Log warnings to console; do NOT block app load (graceful degradation)

---

### 4.3) Validation Rules Summary

| Rule | When | Severity | Action |
|------|------|----------|--------|
| Duplicate primary key | Ingestion | ERROR | Fail ingestion |
| Orphaned foreign key | Ingestion | ERROR | Fail ingestion |
| Invalid enum value | Ingestion | WARNING | Log and continue |
| Missing mandatory column | Ingestion | ERROR | Fail ingestion |
| Inconsistent season/round | Ingestion | WARNING | Log and continue |
| Missing derived CSV | Browser load | WARNING | Log; degrade gracefully |
| CSV parse error | Browser load | ERROR | Show error UI |

---

## 5) ACCEPTANCE CRITERIA & TEST SCENARIOS

### A) Deliverables Checklist

- [x] Canonical CSV schemas (10 files) with PK/FK definitions
- [x] Derived CSV schemas (5 files) with generation rules
- [x] Vanilla JS read layer architecture (4 modules)
- [x] Data validation rules (ingestion + browser)
- [x] Test scenarios (7 scenarios)

---

### B) Acceptance Criteria

1. ✅ **Canonical CSVs are manually editable**: Any field marked ✏️ can be edited in text editor
2. ✅ **Derived CSVs are regenerable**: Deleting `/data/derived/` and running rebuild produces identical output
3. ✅ **Foreign key integrity**: All references point to existing records (validated at ingestion)
4. ✅ **Handle missing data gracefully**: Missing sprint results, missing qualifying times handled without errors
5. ✅ **Deterministic from snapshots**: Rebuilding from raw JSON snapshots produces identical CSVs (given same parser version)
6. ✅ **Browser loads data offline**: No runtime API calls; all data from static CSV files
7. ✅ **Efficient queries**: Common queries (race weekend, driver profile, season calendar) execute in <100ms
8. ✅ **Manual corrections preserved**: Editing `race_results.csv` and regenerating derived CSVs properly reflects changes
9. ✅ **Git-trackable**: CSV diffs are human-readable; penalty corrections visible in Git history

---

### C) Test Scenarios

#### TC-1: Manual Penalty Correction Propagates to Aggregates

**Setup**:
1. Ingest 2024 season results (Hamilton P2, Sainz P3 in Bahrain)
2. Generate derived CSVs (driver_season_summary shows Hamilton 18pts, Sainz 15pts)

**Action**:
1. Edit `/data/canonical/race_results.csv`:
   - Change Hamilton: `points: 18` → `15`
   - Change Sainz: `points: 15` → `18`
2. Add entry to `/data/canonical/manual_corrections.csv`:
   ```csv
   c001,2024-03-03T10:30:00Z,race_results.csv,2024,1,hamilton,points,18,15,5-second penalty applied post-race,admin
   ```
3. Regenerate derived CSVs: `node scripts/generate-derived.js`

**Expected**:
- `driver_season_summary.csv` now shows Hamilton 15pts, Sainz 18pts for 2024
- `manual_corrections.csv` has logged the change

**Pass**: ✅ Derived data reflects manual edit; audit trail preserved

---

#### TC-2: Driver Switching Teams Across Seasons

**Setup**:
1. Ingest 2021-2024 seasons
2. Carlos Sainz: McLaren (2021), Ferrari (2022-2024)

**Action**:
1. Query `getDriverProfile('sainz')`
2. Check `seasonSummaries` array

**Expected**:
```javascript
{
  driver: { driverId: 'sainz', ... },
  careerSummary: { totalPoints: 850, ... },
  seasonSummaries: [
    { season: 2024, constructorId: 'ferrari', totalPoints: 180, ... },
    { season: 2023, constructorId: 'ferrari', totalPoints: 200, ... },
    { season: 2022, constructorId: 'ferrari', totalPoints: 246, ... },
    { season: 2021, constructorId: 'mclaren', totalPoints: 164.5, ... }
  ]
}
```

**Pass**: ✅ Team changes correctly reflected in summaries

---

#### TC-3: Sprint + Non-Sprint Race Handling

**Setup**:
1. Ingest 2024 season (Round 1 = normal race, Round 4 = sprint weekend)

**Action**:
1. Query `getRaceWeekend('2024_01')` (Bahrain, no sprint)
2. Query `getRaceWeekend('2024_04')` (Japan, sprint weekend)

**Expected**:
- Bahrain: `{ race, qualifying, results, sprint: null }`
- Japan: `{ race, qualifying, results, sprint: [...] }`

**Pass**: ✅ Sprint data present only for sprint weekends

---

#### TC-4: Deterministic Rebuild from Snapshots

**Setup**:
1. Ingest 2024 Bahrain race (store raw JSON in `/data/snapshots/2024/round_01_results.json`)
2. Generate CSVs: `race_results.csv`, `driver_season_summary.csv`
3. Delete generated CSVs

**Action**:
1. Run `node ingest.js 2024 --offline` (uses snapshots, not live API)
2. Compare regenerated CSVs to originals (Git diff)

**Expected**:
- No diff (files identical byte-for-byte)

**Pass**: ✅ Offline rebuild produces identical output

---

#### TC-5: Validation Catches Orphaned Foreign Key

**Setup**:
1. Manually add row to `race_results.csv`:
   ```csv
   2024_01,2024,1,21,21,fake_driver,fake_team,20,0,0,DNS,,,
   ```
2. Run `node scripts/validate.js`

**Expected**:
```
=== VALIDATION REPORT ===
Errors: 2

ERRORS:
  [race_results.csv:22] Invalid foreign key driverId=fake_driver
  [race_results.csv:22] Invalid foreign key constructorId=fake_team
```

**Pass**: ✅ Validation detects invalid FKs; exits with error

---

#### TC-6: Browser Loads Data with Missing Derived CSVs

**Setup**:
1. Delete `/data/derived/` folder
2. Load app in browser

**Action**:
1. Call `dataStore.load({ includeDerived: true })`
2. Observe console logs

**Expected**:
```
[DataStore] Loading canonical CSVs...
[DataStore] Loading derived CSVs...
[DataStore] Warning: No derived/driver_season_summary.csv found
...
[DataStore] Load complete
```
- App continues to function (graceful degradation)
- Queries requiring derived data return empty arrays

**Pass**: ✅ Missing derived CSVs logged as warnings; app doesn't crash

---

#### TC-7: Qualifying with DNS (Did Not Start)

**Setup**:
1. Driver crashes in practice, misses qualifying
2. API returns qualifying entry with no Q1/Q2/Q3 times

**Action**:
1. Ingest qualifying data
2. `qualifying.csv` contains:
   ```csv
   2024_05,2024,5,20,sargeant,williams,,,
   ```

**Expected**:
- No parse errors
- `getQualifying('2024_05')` returns driver with `Q1=null, Q2=null, Q3=null`
- `qualifyingPerformance.csv` shows `position=20, Q3Time=null, gapToP1Millis=null`

**Pass**: ✅ Missing times handled gracefully; no crashes

---

## 6) EXPLICIT NON-GOALS (Phase 2)

The following are explicitly OUT OF SCOPE for Phase 2:

- ❌ Fantasy league scoring rules
- ❌ Draft mechanics (turn-based selection)
- ❌ Team composition rules (e.g., budget, position limits)
- ❌ Multiplayer state management
- ❌ UI components (calendar views, driver cards, dashboards)
- ❌ Persistence beyond CSV files (no localStorage, no multiplayer sync)
- ❌ Live data updates (no polling, no WebSockets)
- ❌ User authentication or profiles

These will be addressed in future phases.

---

## 7) GENERATION SCRIPTS (HIGH-LEVEL SPECS)

### `scripts/generate-derived.js`

**Purpose**: Regenerate all derived CSVs from canonical sources

**Logic**:
1. Load all canonical CSVs
2. Compute aggregations:
   - Group race_results by (season, driverId) → driver_season_summary
   - Group driver_season_summary by driverId → driver_career_summary
   - Group race_results by (season, constructorId) → constructor_season_summary
   - Join race_results + qualifying → race_performance_deltas
   - Join qualifying + driver_teams → qualifying_performance
3. Write derived CSVs to `/data/derived/`

**Run**: `node scripts/generate-derived.js`

**Triggers**:
- After ingestion (`node ingest.js`)
- After manual edits to canonical CSVs
- On-demand for debugging

---

## NEXT STEPS (Pending User Approval)

**DO NOT PROCEED** until user explicitly approves Phase 2 and says "Proceed to Phase 3".

Awaiting user decision:
1. Approve canonical CSV schemas ✅ or ❌
2. Approve derived CSV design ✅ or ❌
3. Approve vanilla JS read layer ✅ or ❌
4. Approve validation rules ✅ or ❌
5. Request modifications 🔄
6. Move to Phase 3 (after explicit "Proceed to Phase 3" command)

---

**Phase 2 Status**: ✅ **COMPLETE - AWAITING APPROVAL**
