# PHASE 4: TURN-BASED DRAFT MECHANICS (NO SCORING YET)

**Status**: IN PROGRESS
**Prerequisites**: Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅
**Technology**: Vanilla JS, localStorage (optional)
**Players**: 2 (1v1 head-to-head)

---

## 1) DRAFT DOMAIN MODEL

### 1.1) Core Entities

All draft entities are **in-memory JavaScript objects** with optional JSON serialization for persistence.

---

#### **Player**

```javascript
{
  playerId: string,           // Unique ID (e.g., "player_1", "player_2")
  name: string,               // Display name (e.g., "Player A", "Player B")
  roster: Array<string>,      // Array of driverId's (e.g., ["max_verstappen", "leclerc"])
  draftOrder: number          // Draft position: 1 or 2
}
```

**Example**:
```javascript
{
  playerId: "player_1",
  name: "Player A",
  roster: ["max_verstappen", "leclerc", "sainz"],
  draftOrder: 1
}
```

---

#### **Draft**

```javascript
{
  draftId: string,                    // Unique draft ID (e.g., "draft_2024_04_15")
  season: number,                     // Season year (e.g., 2024)
  status: string,                     // "setup" | "in_progress" | "completed" | "abandoned"
  players: Array<Player>,             // Array of 2 Player objects
  picks: Array<Pick>,                 // Chronological pick history
  currentPickIndex: number,           // Index of next pick (0-based)
  config: DraftConfig,                // Draft configuration
  createdAt: string,                  // ISO timestamp
  completedAt: string | null          // ISO timestamp when draft completed
}
```

**Example**:
```javascript
{
  draftId: "draft_2024_04_15_1234",
  season: 2024,
  status: "in_progress",
  players: [
    { playerId: "player_1", name: "Player A", roster: ["max_verstappen"], draftOrder: 1 },
    { playerId: "player_2", name: "Player B", roster: ["leclerc"], draftOrder: 2 }
  ],
  picks: [
    { pickNumber: 1, round: 1, playerId: "player_1", driverId: "max_verstappen", timestamp: "..." },
    { pickNumber: 2, round: 1, playerId: "player_2", driverId: "leclerc", timestamp: "..." }
  ],
  currentPickIndex: 2,
  config: { /* see DraftConfig below */ },
  createdAt: "2024-04-15T10:00:00Z",
  completedAt: null
}
```

---

#### **Pick**

```javascript
{
  pickNumber: number,         // Overall pick number (1-based, e.g., 1, 2, 3...)
  round: number,              // Draft round (1-based, e.g., Round 1, Round 2...)
  playerId: string,           // Player who made this pick
  driverId: string,           // Driver selected
  timestamp: string           // ISO timestamp when pick was made
}
```

**Example**:
```javascript
{
  pickNumber: 1,
  round: 1,
  playerId: "player_1",
  driverId: "max_verstappen",
  timestamp: "2024-04-15T10:05:23Z"
}
```

---

#### **DraftConfig**

Configuration object defining draft rules.

```javascript
{
  rosterSize: number,         // Number of drivers per team (e.g., 5)
  draftType: string,          // "snake" | "fixed"
  playerCount: number,        // Always 2 for Phase 4
  allowDuplicates: boolean,   // Always false (drivers can only be picked once)
  season: number              // Season for available drivers (e.g., 2024)
}
```

**Example**:
```javascript
{
  rosterSize: 5,
  draftType: "snake",
  playerCount: 2,
  allowDuplicates: false,
  season: 2024
}
```

---

### 1.2) Draft Type Definitions

#### **Snake Draft**

Pick order alternates AND reverses each round.

**Example (rosterSize=5, 2 players)**:
```
Round 1: Player 1 → Player 2
Round 2: Player 2 → Player 1  (reversed)
Round 3: Player 1 → Player 2
Round 4: Player 2 → Player 1  (reversed)
Round 5: Player 1 → Player 2
```

**Total Picks**: 10 (5 per player)

**Pick Order**:
```
Pick  1: Player 1  (Round 1, Pick 1)
Pick  2: Player 2  (Round 1, Pick 2)
Pick  3: Player 2  (Round 2, Pick 1) ← Snake reversal
Pick  4: Player 1  (Round 2, Pick 2)
Pick  5: Player 1  (Round 3, Pick 1)
Pick  6: Player 2  (Round 3, Pick 2)
Pick  7: Player 2  (Round 4, Pick 1) ← Snake reversal
Pick  8: Player 1  (Round 4, Pick 2)
Pick  9: Player 1  (Round 5, Pick 1)
Pick 10: Player 2  (Round 5, Pick 2)
```

**Algorithm**:
```javascript
function getPlayerForPick(pickIndex, playerCount, rosterSize, draftType) {
  if (draftType === 'snake') {
    const round = Math.floor(pickIndex / playerCount); // 0-based round
    const positionInRound = pickIndex % playerCount;

    // If odd round, reverse order
    if (round % 2 === 1) {
      return playerCount - 1 - positionInRound;
    }
    return positionInRound;
  }

  // Fixed: simple alternating
  return pickIndex % playerCount;
}
```

---

#### **Fixed Draft**

Simple alternating picks, no reversal.

**Example (rosterSize=5, 2 players)**:
```
Round 1: Player 1 → Player 2
Round 2: Player 1 → Player 2
Round 3: Player 1 → Player 2
Round 4: Player 1 → Player 2
Round 5: Player 1 → Player 2
```

**Pick Order**:
```
Pick  1: Player 1
Pick  2: Player 2
Pick  3: Player 1
Pick  4: Player 2
...
```

---

### 1.3) Roster Constraints

For Phase 4, roster constraints are **minimal**:
- Max roster size (configurable, default 5 drivers)
- No duplicate drivers across teams
- No budget constraints (future phase)
- No position requirements (future phase)

---

## 2) DRAFT RULES SYSTEM

### 2.1) DraftRules Class

**Purpose**: Encapsulate draft logic and validation

```javascript
// lib/draft-rules.js

export class DraftRules {
  constructor(config) {
    this.config = config;
  }

  /**
   * Calculates total number of picks in the draft.
   * @returns {number}
   */
  getTotalPicks() {
    return this.config.rosterSize * this.config.playerCount;
  }

  /**
   * Determines which player should pick for a given pick index.
   * @param {number} pickIndex - 0-based pick index
   * @returns {number} - Player draft order (0 or 1 for array index)
   */
  getPlayerForPick(pickIndex) {
    const { playerCount, rosterSize, draftType } = this.config;

    if (draftType === 'snake') {
      const round = Math.floor(pickIndex / playerCount);
      const positionInRound = pickIndex % playerCount;

      // Odd rounds reverse order
      if (round % 2 === 1) {
        return playerCount - 1 - positionInRound;
      }
      return positionInRound;
    }

    // Fixed: simple alternating
    return pickIndex % playerCount;
  }

  /**
   * Calculates the round number for a pick index.
   * @param {number} pickIndex - 0-based pick index
   * @returns {number} - 1-based round number
   */
  getRoundForPick(pickIndex) {
    return Math.floor(pickIndex / this.config.playerCount) + 1;
  }

  /**
   * Validates if a driver can be drafted.
   * @param {string} driverId - Driver to validate
   * @param {Array<string>} draftedDrivers - Already drafted driver IDs
   * @returns {Object} - { valid: boolean, reason: string }
   */
  validatePick(driverId, draftedDrivers) {
    // Check if already drafted
    if (draftedDrivers.includes(driverId)) {
      return { valid: false, reason: 'Driver already drafted' };
    }

    // Future: Add budget, position constraints here

    return { valid: true, reason: null };
  }

  /**
   * Checks if draft is complete.
   * @param {number} pickCount - Number of picks made
   * @returns {boolean}
   */
  isDraftComplete(pickCount) {
    return pickCount >= this.getTotalPicks();
  }

  /**
   * Checks if a player's roster is full.
   * @param {Array<string>} roster - Player's current roster
   * @returns {boolean}
   */
  isRosterFull(roster) {
    return roster.length >= this.config.rosterSize;
  }
}
```

---

### 2.2) Default Configuration

```javascript
// lib/draft-config.js

export const DEFAULT_DRAFT_CONFIG = {
  rosterSize: 5,
  draftType: 'snake',
  playerCount: 2,
  allowDuplicates: false,
  season: new Date().getFullYear()
};

export const DRAFT_TYPES = {
  SNAKE: 'snake',
  FIXED: 'fixed'
};

export const DRAFT_STATUS = {
  SETUP: 'setup',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
};
```

---

## 3) DRAFT STATE MANAGER

### 3.1) DraftStore Class

**Purpose**: Manage draft state and persistence

```javascript
// lib/draft-store.js

import { DraftRules } from './draft-rules.js';
import { DEFAULT_DRAFT_CONFIG, DRAFT_STATUS } from './draft-config.js';

export class DraftStore {
  constructor() {
    this.draft = null;
    this.rules = null;
    this.listeners = [];
  }

  /**
   * Creates a new draft.
   * @param {Object} config - Draft configuration
   * @param {Array<Object>} players - Player objects [{ name, draftOrder }]
   * @returns {Object} - New draft object
   */
  createDraft(config = DEFAULT_DRAFT_CONFIG, players) {
    const draftId = `draft_${Date.now()}`;

    this.draft = {
      draftId,
      season: config.season,
      status: DRAFT_STATUS.SETUP,
      players: players.map((p, idx) => ({
        playerId: `player_${idx + 1}`,
        name: p.name || `Player ${idx + 1}`,
        roster: [],
        draftOrder: p.draftOrder !== undefined ? p.draftOrder : idx
      })),
      picks: [],
      currentPickIndex: 0,
      config,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    this.rules = new DraftRules(config);

    this.notifyListeners();
    return this.draft;
  }

  /**
   * Starts the draft (transitions from setup to in_progress).
   */
  startDraft() {
    if (!this.draft) throw new Error('No draft created');
    if (this.draft.status !== DRAFT_STATUS.SETUP) {
      throw new Error('Draft already started or completed');
    }

    this.draft.status = DRAFT_STATUS.IN_PROGRESS;
    this.notifyListeners();
  }

  /**
   * Makes a pick for the current player.
   * @param {string} driverId - Driver to draft
   * @returns {Object} - { success: boolean, error: string }
   */
  makePick(driverId) {
    if (!this.draft || this.draft.status !== DRAFT_STATUS.IN_PROGRESS) {
      return { success: false, error: 'Draft not active' };
    }

    // Get current player
    const playerIndex = this.rules.getPlayerForPick(this.draft.currentPickIndex);
    const player = this.draft.players[playerIndex];

    // Validate pick
    const draftedDrivers = this.draft.picks.map(p => p.driverId);
    const validation = this.rules.validatePick(driverId, draftedDrivers);

    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Create pick
    const pick = {
      pickNumber: this.draft.currentPickIndex + 1,
      round: this.rules.getRoundForPick(this.draft.currentPickIndex),
      playerId: player.playerId,
      driverId,
      timestamp: new Date().toISOString()
    };

    // Add pick to history
    this.draft.picks.push(pick);

    // Add driver to player roster
    player.roster.push(driverId);

    // Advance pick index
    this.draft.currentPickIndex++;

    // Check if draft is complete
    if (this.rules.isDraftComplete(this.draft.picks.length)) {
      this.draft.status = DRAFT_STATUS.COMPLETED;
      this.draft.completedAt = new Date().toISOString();
    }

    this.notifyListeners();
    this.saveDraft(); // Persist to localStorage

    return { success: true, pick };
  }

  /**
   * Undoes the last pick (admin function).
   * @returns {boolean}
   */
  undoLastPick() {
    if (!this.draft || this.draft.picks.length === 0) return false;

    const lastPick = this.draft.picks.pop();
    const player = this.draft.players.find(p => p.playerId === lastPick.playerId);

    if (player) {
      const index = player.roster.indexOf(lastPick.driverId);
      if (index > -1) {
        player.roster.splice(index, 1);
      }
    }

    this.draft.currentPickIndex--;

    if (this.draft.status === DRAFT_STATUS.COMPLETED) {
      this.draft.status = DRAFT_STATUS.IN_PROGRESS;
      this.draft.completedAt = null;
    }

    this.notifyListeners();
    this.saveDraft();

    return true;
  }

  /**
   * Gets the current player whose turn it is.
   * @returns {Object|null} - Player object or null
   */
  getCurrentPlayer() {
    if (!this.draft || this.draft.status !== DRAFT_STATUS.IN_PROGRESS) return null;

    const playerIndex = this.rules.getPlayerForPick(this.draft.currentPickIndex);
    return this.draft.players[playerIndex];
  }

  /**
   * Gets all drafted driver IDs.
   * @returns {Array<string>}
   */
  getDraftedDrivers() {
    return this.draft ? this.draft.picks.map(p => p.driverId) : [];
  }

  /**
   * Checks if a driver has been drafted.
   * @param {string} driverId
   * @returns {boolean}
   */
  isDriverDrafted(driverId) {
    return this.getDraftedDrivers().includes(driverId);
  }

  /**
   * Gets the player who drafted a specific driver.
   * @param {string} driverId
   * @returns {Object|null} - Player object or null
   */
  getPlayerWhoPickedDriver(driverId) {
    if (!this.draft) return null;

    const pick = this.draft.picks.find(p => p.driverId === driverId);
    if (!pick) return null;

    return this.draft.players.find(p => p.playerId === pick.playerId);
  }

  /**
   * Saves draft to localStorage.
   */
  saveDraft() {
    if (!this.draft) return;

    try {
      localStorage.setItem('f1_fantasy_draft', JSON.stringify(this.draft));
      console.log('[DraftStore] Saved to localStorage');
    } catch (err) {
      console.warn('[DraftStore] Failed to save to localStorage:', err);
    }
  }

  /**
   * Loads draft from localStorage.
   * @returns {boolean} - True if draft loaded successfully
   */
  loadDraft() {
    try {
      const saved = localStorage.getItem('f1_fantasy_draft');
      if (!saved) return false;

      this.draft = JSON.parse(saved);
      this.rules = new DraftRules(this.draft.config);

      this.notifyListeners();
      console.log('[DraftStore] Loaded from localStorage');
      return true;
    } catch (err) {
      console.warn('[DraftStore] Failed to load from localStorage:', err);
      return false;
    }
  }

  /**
   * Clears draft and localStorage.
   */
  clearDraft() {
    this.draft = null;
    this.rules = null;

    try {
      localStorage.removeItem('f1_fantasy_draft');
      console.log('[DraftStore] Cleared localStorage');
    } catch (err) {
      console.warn('[DraftStore] Failed to clear localStorage:', err);
    }

    this.notifyListeners();
  }

  /**
   * Subscribes to draft state changes.
   * @param {Function} callback - Function to call when state changes
   * @returns {Function} - Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notifies all listeners of state change.
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.draft));
  }

  /**
   * Gets draft progress stats.
   * @returns {Object}
   */
  getProgress() {
    if (!this.draft || !this.rules) {
      return { totalPicks: 0, picksMade: 0, percentComplete: 0 };
    }

    const totalPicks = this.rules.getTotalPicks();
    const picksMade = this.draft.picks.length;
    const percentComplete = Math.round((picksMade / totalPicks) * 100);

    return { totalPicks, picksMade, percentComplete };
  }
}

// Singleton instance
export const draftStore = new DraftStore();
```

---

## 4) DRAFT UI VIEW

### 4.1) Draft View Design

**Route**: `#/draft` or `#/draft/setup`

**Layout**:
```
┌───────────────────────────────────────────────────────────────┐
│ F1 Fantasy League - Draft                                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ DRAFT SETUP (if not started)                            │   │
│ │ Player 1 Name: [________]  Draft Order: [1 ▼]          │   │
│ │ Player 2 Name: [________]  Draft Order: [2 ▼]          │   │
│ │ Roster Size: [5 ▼]  Draft Type: [Snake ▼]             │   │
│ │ Season: [2024 ▼]                                        │   │
│ │                                     [Start Draft]       │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ DRAFT IN PROGRESS                                       │   │
│ │ Progress: [████████░░] 8/10 picks (80%)                │   │
│ │ Current Pick: Round 4, Pick 2                          │   │
│ │ ON THE CLOCK: Player A                                 │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌──────────────────┬──────────────────────────────────────┐   │
│ │ PLAYER A         │ PLAYER B                             │   │
│ │ ----------------│ ------------------------------------ │   │
│ │ Roster (3/5):    │ Roster (2/5):                        │   │
│ │ 1. VER (P1,R1)  │ 1. LEC (P2,R1)                      │   │
│ │ 2. PER (P4,R2)  │ 2. SAI (P3,R2)                      │   │
│ │ 3. NOR (P5,R3)  │                                      │   │
│ └──────────────────┴──────────────────────────────────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ AVAILABLE DRIVERS                [Search: ________]     │   │
│ │ Filter: [All ▼] [Team ▼]                               │   │
│ ├──────┬────────────────┬──────────────┬────────┬─────────┤   │
│ │ Code │ Driver         │ Team         │ Points │ Action  │   │
│ │ VER  │ Verstappen     │ Red Bull     │  575   │ DRAFTED │   │
│ │ LEC  │ Leclerc        │ Ferrari      │  356   │ DRAFTED │   │
│ │ SAI  │ Sainz          │ Ferrari      │  308   │ DRAFTED │   │
│ │ NOR  │ Norris         │ McLaren      │  280   │ DRAFTED │   │
│ │ HAM  │ Hamilton       │ Mercedes     │  234   │ [PICK]  │   │
│ │ ALO  │ Alonso         │ Aston Martin │  206   │ [PICK]  │   │
│ └──────┴────────────────┴──────────────┴────────┴─────────┘   │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ PICK HISTORY                                            │   │
│ │ Round 4, Pick 1: Player B → NOR (Norris)               │   │
│ │ Round 3, Pick 2: Player A → PER (Perez)                │   │
│ │ Round 3, Pick 1: Player B → SAI (Sainz)                │   │
│ │ Round 2, Pick 2: Player A → ...                        │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ [Undo Last Pick] [Reset Draft] [Complete Draft]              │
└───────────────────────────────────────────────────────────────┘
```

---

### 4.2) Draft View Implementation

```javascript
// views/draft-view.js

import { BaseView } from './base-view.js';
import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';
import { DEFAULT_DRAFT_CONFIG, DRAFT_STATUS, DRAFT_TYPES } from '../lib/draft-config.js';

export class DraftView extends BaseView {
  constructor() {
    super();
    this.unsubscribe = null;
    this.searchQuery = '';
    this.filterTeam = 'all';
  }

  async render(container, params) {
    this.root = container;

    // Subscribe to draft state changes
    this.unsubscribe = draftStore.subscribe(() => this.update());

    // Try to load existing draft
    const loaded = draftStore.loadDraft();

    // Render based on draft status
    this.update();
  }

  update() {
    if (!this.root) return;

    this.root.innerHTML = '';

    const draft = draftStore.draft;

    if (!draft || draft.status === DRAFT_STATUS.SETUP) {
      this.renderSetup();
    } else if (draft.status === DRAFT_STATUS.IN_PROGRESS) {
      this.renderDraftInProgress();
    } else if (draft.status === DRAFT_STATUS.COMPLETED) {
      this.renderDraftComplete();
    }
  }

  renderSetup() {
    const section = this.createElement('section', 'draft-setup');
    const heading = this.createElement('h1', 'page-title', 'Draft Setup');
    section.appendChild(heading);

    const form = this.createElement('form', 'setup-form');

    // Player 1 name
    const p1Group = this.createFormGroup('Player 1 Name', 'text', 'player1Name', 'Player A');
    form.appendChild(p1Group);

    // Player 2 name
    const p2Group = this.createFormGroup('Player 2 Name', 'text', 'player2Name', 'Player B');
    form.appendChild(p2Group);

    // Roster size
    const rosterGroup = this.createElement('div', 'form-group');
    const rosterLabel = this.createElement('label', '', 'Roster Size:');
    const rosterSelect = this.createElement('select', 'roster-size-select');
    rosterSelect.id = 'rosterSize';
    [3, 4, 5, 6, 7, 8].forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = `${size} drivers`;
      option.selected = (size === 5);
      rosterSelect.appendChild(option);
    });
    rosterGroup.appendChild(rosterLabel);
    rosterGroup.appendChild(rosterSelect);
    form.appendChild(rosterGroup);

    // Draft type
    const typeGroup = this.createElement('div', 'form-group');
    const typeLabel = this.createElement('label', '', 'Draft Type:');
    const typeSelect = this.createElement('select', 'draft-type-select');
    typeSelect.id = 'draftType';

    const snakeOption = document.createElement('option');
    snakeOption.value = DRAFT_TYPES.SNAKE;
    snakeOption.textContent = 'Snake Draft (1-2, 2-1, 1-2...)';
    snakeOption.selected = true;
    typeSelect.appendChild(snakeOption);

    const fixedOption = document.createElement('option');
    fixedOption.value = DRAFT_TYPES.FIXED;
    fixedOption.textContent = 'Fixed Alternating (1-2, 1-2, 1-2...)';
    typeSelect.appendChild(fixedOption);

    typeGroup.appendChild(typeLabel);
    typeGroup.appendChild(typeSelect);
    form.appendChild(typeGroup);

    // Season
    const seasonGroup = this.createElement('div', 'form-group');
    const seasonLabel = this.createElement('label', '', 'Season:');
    const seasonSelect = this.createElement('select', 'season-select');
    seasonSelect.id = 'season';

    const seasons = dataStore.data.seasons.map(s => parseInt(s.season)).sort((a, b) => b - a);
    seasons.forEach(season => {
      const option = document.createElement('option');
      option.value = season;
      option.textContent = season;
      option.selected = (season === new Date().getFullYear());
      seasonSelect.appendChild(option);
    });

    seasonGroup.appendChild(seasonLabel);
    seasonGroup.appendChild(seasonSelect);
    form.appendChild(seasonGroup);

    // Start button
    const startBtn = this.createElement('button', 'btn-primary', 'Start Draft');
    startBtn.type = 'button';
    startBtn.addEventListener('click', () => this.handleStartDraft(form));
    form.appendChild(startBtn);

    section.appendChild(form);
    this.root.appendChild(section);
  }

  createFormGroup(label, type, id, placeholder) {
    const group = this.createElement('div', 'form-group');
    const labelEl = this.createElement('label', '', label + ':');
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.placeholder = placeholder;
    input.classList.add('form-input');

    group.appendChild(labelEl);
    group.appendChild(input);
    return group;
  }

  handleStartDraft(form) {
    const player1Name = form.querySelector('#player1Name').value || 'Player A';
    const player2Name = form.querySelector('#player2Name').value || 'Player B';
    const rosterSize = parseInt(form.querySelector('#rosterSize').value);
    const draftType = form.querySelector('#draftType').value;
    const season = parseInt(form.querySelector('#season').value);

    const config = {
      rosterSize,
      draftType,
      playerCount: 2,
      allowDuplicates: false,
      season
    };

    const players = [
      { name: player1Name, draftOrder: 0 },
      { name: player2Name, draftOrder: 1 }
    ];

    draftStore.createDraft(config, players);
    draftStore.startDraft();
  }

  renderDraftInProgress() {
    const draft = draftStore.draft;

    // Header with progress
    this.renderDraftHeader();

    // Player rosters
    this.renderPlayerRosters();

    // Available drivers
    this.renderAvailableDrivers();

    // Pick history
    this.renderPickHistory();

    // Action buttons
    this.renderActionButtons();
  }

  renderDraftHeader() {
    const header = this.createElement('div', 'draft-header');

    const title = this.createElement('h1', 'page-title', 'Draft in Progress');
    header.appendChild(title);

    const progress = draftStore.getProgress();
    const progressBar = this.createElement('div', 'progress-container');

    const progressFill = this.createElement('div', 'progress-fill');
    progressFill.style.width = `${progress.percentComplete}%`;
    progressBar.appendChild(progressFill);

    const progressText = this.createElement('p', 'progress-text',
      `${progress.picksMade}/${progress.totalPicks} picks (${progress.percentComplete}%)`
    );

    header.appendChild(progressText);
    header.appendChild(progressBar);

    // Current pick info
    const currentPlayer = draftStore.getCurrentPlayer();
    if (currentPlayer) {
      const draft = draftStore.draft;
      const round = draftStore.rules.getRoundForPick(draft.currentPickIndex);
      const pickInRound = (draft.currentPickIndex % draft.config.playerCount) + 1;

      const currentTurn = this.createElement('div', 'current-turn');
      currentTurn.innerHTML = `
        <p>Round ${round}, Pick ${pickInRound}</p>
        <p class="on-clock">ON THE CLOCK: <strong>${currentPlayer.name}</strong></p>
      `;
      header.appendChild(currentTurn);
    }

    this.root.appendChild(header);
  }

  renderPlayerRosters() {
    const draft = draftStore.draft;
    const section = this.createElement('section', 'player-rosters');

    const grid = this.createElement('div', 'rosters-grid');

    draft.players.forEach(player => {
      const panel = this.createElement('div', ['player-panel', draftStore.getCurrentPlayer()?.playerId === player.playerId ? 'active' : '']);

      const name = this.createElement('h2', 'player-name', player.name);
      panel.appendChild(name);

      const rosterHeader = this.createElement('p', 'roster-header',
        `Roster (${player.roster.length}/${draft.config.rosterSize}):`
      );
      panel.appendChild(rosterHeader);

      const rosterList = this.createElement('ul', 'roster-list');

      player.roster.forEach((driverId, idx) => {
        const driver = dataStore.indexes.driverById.get(driverId);
        const pick = draft.picks.find(p => p.driverId === driverId);

        const item = this.createElement('li', 'roster-item');
        item.innerHTML = `
          <span class="roster-number">${idx + 1}.</span>
          <span class="driver-name">${driver ? driver.code : driverId}</span>
          <span class="pick-info">(P${pick.pickNumber}, R${pick.round})</span>
        `;
        rosterList.appendChild(item);
      });

      panel.appendChild(rosterList);
      grid.appendChild(panel);
    });

    section.appendChild(grid);
    this.root.appendChild(section);
  }

  renderAvailableDrivers() {
    const section = this.createElement('section', 'available-drivers');
    const heading = this.createElement('h2', 'section-heading', 'Available Drivers');
    section.appendChild(heading);

    // Search and filters
    const controls = this.createElement('div', 'driver-controls');

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search drivers...';
    searchInput.classList.add('search-input');
    searchInput.value = this.searchQuery;
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.update();
    });

    controls.appendChild(searchInput);
    section.appendChild(controls);

    // Drivers table
    const table = this.createElement('table', 'drivers-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Code</th>
          <th>Driver</th>
          <th>Team</th>
          <th>2023 Points</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Get season drivers
    const draft = draftStore.draft;
    const seasonDrivers = dataStore.data.driverTeams
      .filter(dt => parseInt(dt.season) === draft.config.season)
      .map(dt => dt.driverId);

    // Get driver stats
    const draftedDrivers = draftStore.getDraftedDrivers();

    seasonDrivers.forEach(driverId => {
      const driver = dataStore.indexes.driverById.get(driverId);
      if (!driver) return;

      // Filter by search query
      const fullName = `${driver.givenName} ${driver.familyName}`.toLowerCase();
      if (this.searchQuery && !fullName.includes(this.searchQuery) && !driver.code.toLowerCase().includes(this.searchQuery)) {
        return;
      }

      const driverTeam = dataStore.data.driverTeams.find(
        dt => dt.driverId === driverId && parseInt(dt.season) === draft.config.season
      );
      const constructor = driverTeam ? dataStore.indexes.constructorById.get(driverTeam.constructorId) : null;

      // Get previous season stats
      const prevSeason = draft.config.season - 1;
      const stats = dataStore.getDriverSeasonSummary(prevSeason, driverId);

      const isDrafted = draftedDrivers.includes(driverId);

      const row = document.createElement('tr');
      row.classList.toggle('drafted', isDrafted);

      const actionCell = isDrafted
        ? `<td class="drafted-badge">DRAFTED</td>`
        : `<td><button class="pick-btn" data-driver-id="${driverId}">PICK</button></td>`;

      row.innerHTML = `
        <td class="code">${driver.code}</td>
        <td class="name">${driver.familyName}</td>
        <td class="team">${constructor ? constructor.name : 'N/A'}</td>
        <td class="points">${stats ? Math.round(stats.totalPoints) : 'N/A'}</td>
        ${actionCell}
      `;

      tbody.appendChild(row);
    });

    // Add click handlers for pick buttons
    tbody.querySelectorAll('.pick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const driverId = e.target.dataset.driverId;
        this.handlePick(driverId);
      });
    });

    section.appendChild(table);
    this.root.appendChild(section);
  }

  handlePick(driverId) {
    const result = draftStore.makePick(driverId);

    if (!result.success) {
      alert(`Cannot pick driver: ${result.error}`);
    }
  }

  renderPickHistory() {
    const section = this.createElement('section', 'pick-history');
    const heading = this.createElement('h2', 'section-heading', 'Pick History');
    section.appendChild(heading);

    const draft = draftStore.draft;
    const historyList = this.createElement('ul', 'history-list');

    // Show picks in reverse order (most recent first)
    const reversePicks = [...draft.picks].reverse();

    reversePicks.slice(0, 10).forEach(pick => {
      const player = draft.players.find(p => p.playerId === pick.playerId);
      const driver = dataStore.indexes.driverById.get(pick.driverId);

      const item = this.createElement('li', 'history-item');
      item.innerHTML = `
        <span class="pick-meta">Round ${pick.round}, Pick ${pick.pickNumber}:</span>
        <span class="player">${player.name}</span> →
        <span class="driver">${driver ? driver.code : pick.driverId} (${driver ? driver.familyName : ''})</span>
      `;
      historyList.appendChild(item);
    });

    if (draft.picks.length === 0) {
      const noHistory = this.createElement('p', 'no-data', 'No picks yet.');
      section.appendChild(noHistory);
    } else {
      section.appendChild(historyList);
    }

    this.root.appendChild(section);
  }

  renderActionButtons() {
    const actions = this.createElement('div', 'draft-actions');

    const undoBtn = this.createElement('button', 'btn-secondary', 'Undo Last Pick');
    undoBtn.addEventListener('click', () => {
      if (confirm('Undo the last pick?')) {
        draftStore.undoLastPick();
      }
    });

    const resetBtn = this.createElement('button', 'btn-danger', 'Reset Draft');
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the entire draft? This cannot be undone.')) {
        draftStore.clearDraft();
      }
    });

    actions.appendChild(undoBtn);
    actions.appendChild(resetBtn);

    this.root.appendChild(actions);
  }

  renderDraftComplete() {
    const section = this.createElement('section', 'draft-complete');
    const heading = this.createElement('h1', 'page-title', '🏁 Draft Complete!');
    section.appendChild(heading);

    const draft = draftStore.draft;

    // Show final rosters
    const rostersGrid = this.createElement('div', 'rosters-grid');

    draft.players.forEach(player => {
      const panel = this.createElement('div', 'player-panel');

      const name = this.createElement('h2', 'player-name', player.name);
      panel.appendChild(name);

      const rosterList = this.createElement('ul', 'roster-list');

      player.roster.forEach((driverId, idx) => {
        const driver = dataStore.indexes.driverById.get(driverId);
        const item = this.createElement('li', 'roster-item');
        item.textContent = `${idx + 1}. ${driver ? `${driver.givenName} ${driver.familyName}` : driverId}`;
        rosterList.appendChild(item);
      });

      panel.appendChild(rosterList);
      rostersGrid.appendChild(panel);
    });

    section.appendChild(rostersGrid);

    // Action buttons
    const actions = this.createElement('div', 'draft-actions');

    const newDraftBtn = this.createElement('button', 'btn-primary', 'Start New Draft');
    newDraftBtn.addEventListener('click', () => {
      if (confirm('Start a new draft? This will clear the current draft.')) {
        draftStore.clearDraft();
      }
    });

    const viewTeamsBtn = this.createElement('button', 'btn-secondary', 'View Teams');
    viewTeamsBtn.addEventListener('click', () => {
      // Future: Navigate to team comparison view
      alert('Team comparison view coming in Phase 5!');
    });

    actions.appendChild(newDraftBtn);
    actions.appendChild(viewTeamsBtn);

    section.appendChild(actions);
    this.root.appendChild(section);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    super.destroy();
  }
}
```

---

## 5) INTEGRATION WITH EXISTING VIEWS

### 5.1) Driver Profile View Enhancement

**Update**: Show if driver is drafted

```javascript
// In driver-profile-view.js, add to renderDriverHeader():

renderDriverHeader(driver) {
  const header = this.createElement('div', 'driver-header');

  // ... existing header code ...

  // Check if drafted
  if (draftStore.isDriverDrafted(driver.driverId)) {
    const player = draftStore.getPlayerWhoPickedDriver(driver.driverId);
    const draftedBadge = this.createElement('div', 'drafted-badge');
    draftedBadge.innerHTML = `
      <span class="badge-icon">🏁</span>
      <span class="badge-text">Drafted by ${player.name}</span>
    `;
    header.appendChild(draftedBadge);
  }

  this.root.appendChild(header);
}
```

---

### 5.2) Calendar View Enhancement

**Update**: Add "Start Draft" button on calendar

```javascript
// In calendar-view.js, add to renderHeader():

renderHeader() {
  // ... existing header code ...

  const draftBtn = this.createElement('button', 'btn-draft', '🏁 Start Draft');
  draftBtn.addEventListener('click', () => {
    ViewManager.navigate('#/draft');
  });

  header.appendChild(draftBtn);
  this.root.appendChild(header);
}
```

---

### 5.3) View Manager Registration

**Update**: Register DraftView

```javascript
// In app.js, add:

import { DraftView } from './views/draft-view.js';

// ... in init() ...

viewManager.registerView('draft', new DraftView());
```

---

## 6) CSS STYLES FOR DRAFT

### 6.1) Draft-Specific Styles

```css
/* styles/draft.css */

/* Draft Setup */
.draft-setup {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.setup-form {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.form-input,
.form-group select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
}

.form-input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Draft Header */
.draft-header {
  margin-bottom: var(--spacing-xl);
}

.progress-container {
  width: 100%;
  height: 30px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: var(--spacing-md);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width var(--transition-base);
}

.progress-text {
  text-align: center;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.current-turn {
  text-align: center;
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.on-clock {
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  margin-top: var(--spacing-sm);
}

/* Player Rosters */
.rosters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.player-panel {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  border: 3px solid transparent;
  transition: all var(--transition-base);
}

.player-panel.active {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
}

.player-name {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-md);
  text-align: center;
}

.roster-header {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.roster-list {
  list-style: none;
  padding: 0;
}

.roster-item {
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.roster-number {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
}

.driver-name {
  font-weight: var(--font-weight-medium);
  flex: 1;
}

.pick-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* Available Drivers */
.available-drivers {
  margin-bottom: var(--spacing-xl);
}

.driver-controls {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.search-input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.drivers-table {
  width: 100%;
}

.drivers-table tr.drafted {
  opacity: 0.5;
  background-color: var(--color-bg-secondary);
}

.drivers-table .code {
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-mono);
}

.pick-btn {
  background-color: var(--color-primary);
  color: white;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.pick-btn:hover {
  background-color: #C10500;
}

.drafted-badge {
  color: var(--color-text-muted);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  font-size: var(--font-size-sm);
}

/* Pick History */
.pick-history {
  margin-bottom: var(--spacing-xl);
}

.history-list {
  list-style: none;
  padding: 0;
}

.history-item {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--color-primary);
}

.pick-meta {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  margin-right: var(--spacing-sm);
}

.history-item .player {
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.history-item .driver {
  font-weight: var(--font-weight-bold);
}

/* Action Buttons */
.draft-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-bold);
}

.btn-secondary {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
}

.btn-danger {
  background-color: var(--color-danger);
  color: white;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-bold);
}

/* Draft Complete */
.draft-complete {
  text-align: center;
  padding: var(--spacing-xxl);
}

.draft-complete .rosters-grid {
  margin: var(--spacing-xl) 0;
}

.draft-complete .roster-list {
  text-align: left;
}
```

---

## 7) ACCEPTANCE CRITERIA & TEST SCENARIOS

### A) Deliverables Checklist

- [x] Draft domain model (Player, Draft, Pick, DraftConfig)
- [x] DraftRules class (snake/fixed logic, validation)
- [x] DraftStore class (state management, persistence)
- [x] Draft UI view (setup, in-progress, complete)
- [x] Integration with existing views (driver profiles)
- [x] CSS styles for draft interface
- [x] localStorage persistence (optional)

---

### B) Acceptance Criteria

1. ✅ **Two-Player Support**: Draft supports exactly 2 players
2. ✅ **Snake Draft Logic**: Pick order reverses on odd rounds
3. ✅ **No Duplicates**: Drivers cannot be drafted twice
4. ✅ **Roster Limits**: Draft completes when both rosters reach configured size
5. ✅ **Persistent State**: Draft survives page refresh (via localStorage)
6. ✅ **Undo Support**: Last pick can be undone
7. ✅ **Clear Turn Indicator**: Current player clearly highlighted
8. ✅ **Drafted Drivers Locked**: Already-picked drivers cannot be selected again
9. ✅ **Pick History**: Complete log of all picks with round/player info
10. ✅ **Integration**: Drafted status visible in driver profiles

---

### C) Manual Test Scenarios

#### TC-1: Complete a Full Snake Draft

**Setup**:
1. Navigate to `#/draft`
2. Enter player names: "Alice" and "Bob"
3. Set roster size: 5 drivers
4. Select draft type: Snake
5. Click "Start Draft"

**Actions**:
1. Alice picks VER (Round 1, Pick 1)
2. Bob picks LEC (Round 1, Pick 2)
3. Bob picks SAI (Round 2, Pick 1) ← Snake reversal
4. Alice picks PER (Round 2, Pick 2)
5. Continue until both rosters have 5 drivers

**Expected**:
- Pick order: Alice, Bob, Bob, Alice, Alice, Bob, Bob, Alice, Alice, Bob
- Total picks: 10
- Draft status changes to "Completed"
- "Draft Complete" screen shows final rosters
- No errors in console

**Pass**: ✅ Full draft completes successfully

---

#### TC-2: Attempt Invalid Pick (Already Drafted Driver)

**Setup**:
1. Start draft (Alice vs Bob, roster size 5)
2. Alice picks VER (first pick)

**Actions**:
1. Modify code to allow clicking on VER again
2. Attempt to pick VER a second time

**Expected**:
- Pick button disabled for VER (grayed out)
- If bypassed, `draftStore.makePick('max_verstappen')` returns `{ success: false, error: 'Driver already drafted' }`
- Alert shown to user: "Cannot pick driver: Driver already drafted"

**Pass**: ✅ Duplicate picks prevented

---

#### TC-3: Page Refresh with Persistence

**Setup**:
1. Start draft
2. Make 3 picks (Alice: VER, Bob: LEC, Bob: SAI)
3. Refresh browser (F5)

**Expected**:
- Draft state reloads from localStorage
- Pick history shows all 3 picks
- Rosters show correct drivers
- Current turn is Alice (pick 4)
- Drafted drivers (VER, LEC, SAI) are locked

**Pass**: ✅ State persists across refresh

---

#### TC-4: Page Refresh WITHOUT Persistence

**Setup**:
1. Disable localStorage (browser privacy mode or manually clear)
2. Start draft
3. Make 2 picks
4. Refresh page

**Expected**:
- Draft state lost (no localStorage)
- Draft view shows "Setup" screen
- No errors in console
- User can start new draft

**Pass**: ✅ Graceful degradation without persistence

---

#### TC-5: Navigate Between Draft and Driver Profile

**Setup**:
1. Start draft (Alice vs Bob)
2. Alice picks VER

**Actions**:
1. From available drivers table, click on "Leclerc" name (if clickable) or navigate to `#/driver/leclerc`
2. View Leclerc profile
3. Navigate back to `#/draft`

**Expected**:
- Driver profile loads correctly
- Draft state preserved (Alice has VER in roster)
- Returning to `#/draft` shows current state (Bob's turn)
- No data loss

**Pass**: ✅ Navigation preserves draft state

---

#### TC-6: Driver Profile Shows Drafted Status

**Setup**:
1. Complete draft with Alice picking VER

**Actions**:
1. Navigate to `#/driver/max_verstappen`

**Expected**:
- Driver profile shows "🏁 Drafted by Alice" badge
- Badge styled distinct from regular content

**Pass**: ✅ Drafted status visible in profiles

---

#### TC-7: Undo Last Pick

**Setup**:
1. Start draft
2. Make 4 picks (Alice: VER, Bob: LEC, Bob: SAI, Alice: PER)

**Actions**:
1. Click "Undo Last Pick"
2. Confirm dialog

**Expected**:
- PER removed from Alice's roster
- Alice's roster shows only VER
- Pick history removes last entry
- Current turn is Alice (pick 4 again)
- PER is available to draft again

**Pass**: ✅ Undo works correctly

---

#### TC-8: Reset Draft

**Setup**:
1. Draft in progress with 6 picks made

**Actions**:
1. Click "Reset Draft"
2. Confirm dialog

**Expected**:
- Draft state cleared
- localStorage cleared
- View shows "Setup" screen
- All drivers available again
- No residual state

**Pass**: ✅ Reset clears all state

---

#### TC-9: Fixed Draft Type

**Setup**:
1. Start draft with draft type: Fixed (not snake)
2. Roster size: 4

**Actions**:
1. Complete draft

**Expected**:
- Pick order: Alice, Bob, Alice, Bob, Alice, Bob, Alice, Bob (no reversal)
- Total picks: 8
- Each player has 4 drivers
- Draft completes successfully

**Pass**: ✅ Fixed draft type works

---

#### TC-10: Different Roster Sizes

**Setup**:
1. Start draft with roster size: 3
2. Complete draft

**Actions**:
1. Observe total picks

**Expected**:
- Total picks: 6 (3 per player)
- Draft completes after 6 picks
- Each roster has exactly 3 drivers

**Pass**: ✅ Configurable roster size works

---

## 8) EXPLICIT NON-GOALS (Phase 4)

The following are OUT OF SCOPE for Phase 4:

- ❌ Fantasy scoring rules (points per position, DNF penalties)
- ❌ Race-by-race score tracking
- ❌ Season simulation or progression
- ❌ Head-to-head score comparison
- ❌ Budget constraints for draft
- ❌ Position-based roster requirements (e.g., 2 Red Bull, 1 Ferrari)
- ❌ Live/multiplayer draft (real-time sync)
- ❌ Draft timer (time limit per pick)
- ❌ Trade/waiver system
- ❌ Multiple leagues or tournaments

---

## 9) FILE STRUCTURE SUMMARY

```
/F1-fantasy-league-v2/
├── lib/
│   ├── draft-config.js          # Draft constants and defaults (NEW)
│   ├── draft-rules.js           # Draft logic and validation (NEW)
│   └── draft-store.js           # Draft state management (NEW)
├── views/
│   ├── draft-view.js            # Draft UI implementation (NEW)
│   ├── driver-profile-view.js   # UPDATED: Show drafted status
│   └── calendar-view.js         # UPDATED: Add draft button
├── styles/
│   └── draft.css                # Draft-specific styles (NEW)
└── app.js                       # UPDATED: Register draft view
```

---

## NEXT STEPS (Pending User Approval)

**DO NOT PROCEED** until user explicitly approves Phase 4 and says "Proceed to Phase 5".

Awaiting user decision:
1. Approve draft domain model ✅ or ❌
2. Approve draft rules (snake/fixed logic) ✅ or ❌
3. Approve draft UI design ✅ or ❌
4. Approve state management approach ✅ or ❌
5. Request modifications 🔄
6. Move to Phase 5 (after explicit "Proceed to Phase 5" command)

---

**Phase 4 Status**: ✅ **COMPLETE - AWAITING APPROVAL**
