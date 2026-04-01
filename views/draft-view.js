// views/draft-view.js
// Updated draft view with auto-pairing and side-by-side panels

import { BaseView } from './base-view.js';
import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';
import { createDraftConfig, DRAFT_TYPE_META } from '../lib/draft-config.js';

export class DraftView extends BaseView {
  async render(container, params) {
    this.root = container;

    // Try to load saved player names
    const savedNames = draftStore.loadPlayerNames();

    // Check if draft already exists (it was loaded in constructor)
    if (draftStore.draft) {
      // Resume existing draft - ensure data is loaded for the correct season
      const draftSeason = draftStore.currentSeason || 2026;
      if (!dataStore.loaded || dataStore.season !== draftSeason) {
        dataStore.setSeason(draftSeason);
        await dataStore.load();
      }
      this.renderExistingDraft();
    } else if (savedNames) {
      // Auto-start new draft with saved names and last-used draft type
      this.startNewDraft(savedNames.player1, savedNames.player2, null, savedNames.draftType || 'snake');
    } else {
      // First time - show setup
      this.renderSetup();
    }
  }

  renderSetup() {
    this.root.innerHTML = '';

    const container = this.createElement('div', 'draft-setup');
    const card = this.createElement('div', 'card');

    const title = this.createElement('h1', 'page-title', 'F1 Fantasy League');
    card.appendChild(title);

    // Pre-fill with saved names if available
    const savedNames = draftStore.loadPlayerNames();

    // Form
    const form = this.createElement('form', 'setup-form');
    form.addEventListener('submit', (e) => this.handleSetupSubmit(e));

    // Player 1
    const p1Group = this.createElement('div', 'form-group');
    p1Group.classList.add('player1-input-group');
    const p1Label = this.createElement('label', [], 'Player 1');
    const p1Input = this.createElement('input');
    p1Input.type = 'text';
    p1Input.name = 'player1';
    p1Input.placeholder = 'Enter Player 1 Name';
    p1Input.value = savedNames?.player1 || '';
    p1Group.appendChild(p1Label);
    p1Group.appendChild(p1Input);

    // Player 2
    const p2Group = this.createElement('div', 'form-group');
    p2Group.classList.add('player2-input-group');
    const p2Label = this.createElement('label', [], 'Player 2');
    const p2Input = this.createElement('input');
    p2Input.type = 'text';
    p2Input.name = 'player2';
    p2Input.placeholder = 'Enter Player 2 Name';
    p2Input.value = savedNames?.player2 || '';
    p2Group.appendChild(p2Label);
    p2Group.appendChild(p2Input);

    form.appendChild(p1Group);
    form.appendChild(p2Group);

    // Draft type selector
    const dtGroup = this.createElement('div', 'form-group');
    const dtLabel = this.createElement('label', [], 'Draft Type');
    const dtSelect = this.createElement('select');
    dtSelect.name = 'draftType';
    const savedDraftType = savedNames?.draftType || 'snake';
    for (const [key, meta] of Object.entries(DRAFT_TYPE_META)) {
      const option = this.createElement('option');
      option.value = key;
      option.textContent = `${meta.label} — ${meta.description}`;
      if (key === savedDraftType) option.selected = true;
      dtSelect.appendChild(option);
    }
    dtGroup.appendChild(dtLabel);
    dtGroup.appendChild(dtSelect);
    form.appendChild(dtGroup);

    // Submit button
    const submitBtn = this.createElement('button', 'btn-primary');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Start Draft';
    submitBtn.style.width = '100%';
    submitBtn.style.padding = '1rem';
    submitBtn.style.fontSize = '1.125rem';
    submitBtn.style.marginTop = '1rem';
    form.appendChild(submitBtn);

    card.appendChild(form);
    container.appendChild(card);
    this.root.appendChild(container);
  }

  handleSetupSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    let player1 = formData.get('player1').trim();
    let player2 = formData.get('player2').trim();

    // Use defaults if empty
    if (!player1) player1 = 'Player 1';
    if (!player2) player2 = 'Player 2';

    const draftType = formData.get('draftType') || 'snake';

    // Save player names and draft type preference
    draftStore.savePlayerNames(player1, player2, draftType);

    // Start new draft with current season from draftStore
    const season = draftStore.currentSeason || 2026;
    this.startNewDraft(player1, player2, season, draftType);
  }

  startNewDraft(player1Name, player2Name, season = null, draftType = 'snake') {
    // Use current season from draft store if not specified
    if (!season) {
      season = draftStore.currentSeason || 2026;
    }
    
    // Show loading state with season
    this.root.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading F1 ${season} season data...</p></div>`;

    // Load data for the selected season
    dataStore.setSeason(season);
    dataStore.load().then(() => {
      const config = createDraftConfig(dataStore, season, draftType);

      const players = [
        { name: player1Name, draftOrder: 0 },
        { name: player2Name, draftOrder: 1 }
      ];

      draftStore.createDraft(config, players);
      draftStore.startDraft();

      // Wait a moment for save to complete, then reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }).catch(err => {
      console.error('[DraftView] Failed to load data:', err);
      this.root.innerHTML = '';
      const errorMsg = this.createElement('div', 'error-message');
      errorMsg.innerHTML = `
        <h2>Failed to Load F1 Data</h2>
        <p>${err.message}</p>
        <button class="btn-primary" onclick="window.location.reload()">Try Again</button>
      `;
      this.root.appendChild(errorMsg);
    });
  }

  renderExistingDraft() {
    const draft = draftStore.draft;

    this.root.innerHTML = '';

    // Header
    this.renderDraftHeader();

    // Main content - side by side panels
    const content = this.createElement('div', 'draft-content-new');

    // Left panel - Player 1
    const leftPanel = this.renderPlayerPanel(draft.players[0], 0);
    content.appendChild(leftPanel);

    // Center - Draft area
    const centerPanel = this.renderDraftArea();
    content.appendChild(centerPanel);

    // Right panel - Player 2
    const rightPanel = this.renderPlayerPanel(draft.players[1], 1);
    content.appendChild(rightPanel);

    this.root.appendChild(content);

    // Actions
    this.renderDraftActions();
  }

  renderDraftHeader() {
    const draft = draftStore.draft;
    const currentPlayer = draftStore.getCurrentPlayer();
    const progress = draftStore.getProgress();

    const header = this.createElement('div', 'draft-header');

    const title = this.createElement('h1', [], 'F1 Fantasy Draft');
    title.style.color = 'white';
    header.appendChild(title);

    const status = this.createElement('div', 'draft-status-new');

    const currentPickText = currentPlayer
      ? `${currentPlayer.name}'s turn to pick`
      : 'Draft in progress';

    const pickInfo = this.createElement('div', 'current-pick');
    pickInfo.textContent = currentPickText;
    status.appendChild(pickInfo);

    const progressText = this.createElement('div', 'pick-info');
    // Show current pick number, but cap at totalPicks when complete
    const currentPickNumber = Math.min(progress.picksMade + 1, progress.totalPicks);
    progressText.textContent = progress.picksMade >= progress.totalPicks
      ? `Draft Complete: ${progress.totalPicks} of ${progress.totalPicks}`
      : `Pick ${currentPickNumber} of ${progress.totalPicks}`;
    status.appendChild(progressText);

    // Show draft type badge
    const draftTypeMeta = DRAFT_TYPE_META[draft.config?.draftType];
    if (draftTypeMeta) {
      const typeBadge = this.createElement('div', 'draft-type-badge');
      typeBadge.textContent = draftTypeMeta.label;
      status.appendChild(typeBadge);
    }

    header.appendChild(status);

    this.root.appendChild(header);
  }

  renderPlayerPanel(player, playerIndex) {
    const currentPlayer = draftStore.getCurrentPlayer();
    const draftStatus = draftStore.draft.status;

    // During IN_PROGRESS: only active player can deselect
    // During COMPLETED: both players can deselect their own drivers
    const isActive = draftStatus === 'completed'
      ? true  // All players can modify their roster after completion
      : (currentPlayer && currentPlayer.playerId === player.playerId);

    const panel = this.createElement('div', ['player-panel-new', isActive ? 'active' : '']);

    const header = this.createElement('div', 'panel-header');
    const name = this.createElement('h2', [], player.name);
    if (isActive) {
      name.style.color = '#FFD700'; // Gold for active player
    }
    header.appendChild(name);

    const count = this.createElement('div', 'roster-count-new');
    const rosterSize = draftStore.draft.config.rosterSize;
    count.textContent = `${player.roster.length} / ${rosterSize} drivers`;
    header.appendChild(count);

    panel.appendChild(header);

    // Roster
    const roster = this.createElement('div', 'roster-list-new');

    if (player.roster.length === 0) {
      const empty = this.createElement('div', 'roster-empty-new', 'No drivers yet');
      roster.appendChild(empty);
    } else {
      player.roster.forEach((driverId, index) => {
        const driver = dataStore.indexes.driverById.get(driverId);
        if (!driver) return;

        // Check if this driver was auto-picked
        const pick = draftStore.draft.picks.find(p => p.driverId === driverId);
        const isAutoPicked = pick && pick.autoPicked;

        const canDeselect = isActive;
        const driverEl = this.createElement('div', ['roster-driver-new', canDeselect ? 'deselectable' : '', isAutoPicked ? 'auto-picked' : '']);

        driverEl.innerHTML = `
          <img src="${driver.photoUrl}" alt="" aria-hidden="true" class="driver-photo-small" />
          <div class="driver-code-small">${driver.code}</div>
          <div class="driver-details-small">
            <div class="driver-name-small">${driver.name}${isAutoPicked ? ' <span class="auto-badge">AUTO</span>' : ''}</div>
            <div class="driver-team-small">${driver.team}</div>
          </div>
        `;

        // Make any driver in active player's roster clickable to deselect
        if (canDeselect) {
          driverEl.style.cursor = 'pointer';
          driverEl.addEventListener('click', () => {
            this.handleRemoveDriver(driverId);
          });
        }

        roster.appendChild(driverEl);
      });
    }

    panel.appendChild(roster);

    return panel;
  }

  handleRemoveDriver(driverId) {
    const result = draftStore.removeDriverFromRoster(driverId, dataStore);
    if (result.success) {
      console.log(`Removed driver: ${result.removedDriver}, teammate: ${result.removedTeammate}`);
      this.renderExistingDraft();
    } else {
      alert(result.error || 'Cannot remove driver');
    }
  }

  handleUndoPick() {
    const success = draftStore.undoPickPair();
    if (success) {
      console.log('Undid last pick pair');
      this.renderExistingDraft();
    } else {
      alert('Cannot undo pick');
    }
  }

  renderDraftArea() {
    const area = this.createElement('div', 'draft-area-new');

    const heading = this.createElement('h3', 'draft-area-heading', 'Draft Drivers');
    area.appendChild(heading);

    // Group drivers by team
    const driversByTeam = dataStore.getDriversByTeam();
    const draftedDrivers = draftStore.getDraftedDrivers();

    // Create a map of driver to player (for picked driver colors)
    const driverToPlayerMap = new Map();
    if (draftStore.draft && draftStore.draft.picks) {
      draftStore.draft.picks.forEach(pick => {
        driverToPlayerMap.set(pick.driverId, pick.playerId);
      });
    }

    // Player colors
    const playerColors = {
      'player_1': '#0EA5E9', // Blue
      'player_2': '#F97316'  // Orange
    };

    // Get current player for hover color
    const currentPlayer = draftStore.getCurrentPlayer();
    const currentPlayerIndex = currentPlayer ? draftStore.draft.players.findIndex(p => p.playerId === currentPlayer.playerId) : 0;
    const playerColorClass = currentPlayerIndex === 0 ? 'player1-hover' : 'player2-hover';

    const teamsContainer = this.createElement('div', 'teams-grid-new');

    driversByTeam.forEach((drivers, teamName) => {
      const teamCard = this.createElement('div', 'team-card-new');

      // Check if ANY driver from this team has been drafted
      const teamDrafted = drivers.some(d => draftedDrivers.includes(d.driverId));

      if (teamDrafted) {
        teamCard.classList.add('drafted');
      }

      const teamHeader = this.createElement('div', 'team-header-new');
      teamHeader.textContent = teamName;
      // Set team color for header
      if (drivers.length > 0 && drivers[0].teamColor) {
        teamHeader.style.backgroundColor = drivers[0].teamColor;
      }
      teamCard.appendChild(teamHeader);

      // Create container for drivers (side by side layout)
      const driversContainer = this.createElement('div', 'team-drivers-container');

      drivers.forEach(driver => {
        const isDrafted = draftedDrivers.includes(driver.driverId);
        const driverCard = this.createElement('div', ['team-driver-card-new', isDrafted ? 'picked' : '', playerColorClass]);

        // Set background image
        driverCard.style.backgroundImage = `url(${driver.photoUrl})`;
        driverCard.style.backgroundSize = 'cover';
        driverCard.style.backgroundPosition = 'center top';

        // Add team color border
        if (driver.teamColor) {
          driverCard.style.borderLeftColor = driver.teamColor;
          driverCard.style.borderLeftWidth = '4px';
          driverCard.style.borderLeftStyle = 'solid';
        }

        // Get player color for picked drivers
        let pickedColor = null;
        if (isDrafted) {
          const playerId = driverToPlayerMap.get(driver.driverId);
          pickedColor = playerColors[playerId] || '#999999';
        }

        const hoverLabel = currentPlayer ? `${currentPlayer.name}'s Turn` : '';
        driverCard.innerHTML = `
          <div class="draft-driver-overlay ${isDrafted ? 'picked-overlay' : ''}" data-hover-label="${hoverLabel}" ${isDrafted && pickedColor ? `style="background: linear-gradient(135deg, ${pickedColor}CC 0%, ${pickedColor}99 100%); border-top-color: ${pickedColor};"` : ''}>
            <div class="draft-driver-name">${driver.name}</div>
            ${isDrafted ? '<div class="picked-indicator">PICKED</div>' : ''}
          </div>
        `;

        if (!isDrafted) {
          driverCard.addEventListener('click', () => this.handlePick(driver.driverId));
        }

        driversContainer.appendChild(driverCard);
      });

      teamCard.appendChild(driversContainer);
      teamsContainer.appendChild(teamCard);
    });

    area.appendChild(teamsContainer);

    return area;
  }

  handlePick(driverId) {
    const result = draftStore.makePick(driverId, dataStore);

    if (!result.success) {
      alert(result.error);
      return;
    }

    // Success - show feedback
    const driver = dataStore.indexes.driverById.get(driverId);
    const teammate = dataStore.getTeammate(driverId);

    console.log(`Picked: ${driver.name}, Auto-assigned: ${teammate.name}`);

    // Re-render to show updated state
    this.renderExistingDraft();
  }

  renderDraftActions() {
    const actions = this.createElement('div', 'draft-actions');

    // Always show Confirm Draft button
    const confirmBtn = this.createElement('button', ['btn-primary', 'btn-lg']);
    confirmBtn.textContent = 'Confirm Draft';
    confirmBtn.style.marginRight = '1rem';
    confirmBtn.addEventListener('click', () => {
      // Mark draft as completed if not already
      if (draftStore.draft && draftStore.draft.status !== 'completed') {
        draftStore.draft.status = 'completed';
        draftStore.draft.completedAt = new Date().toISOString();
        draftStore.saveDraft();
      }
      window.location.hash = '#/teams';
    });
    actions.appendChild(confirmBtn);

    this.root.appendChild(actions);
  }

  renderDraftComplete() {
    this.root.innerHTML = '';

    const container = this.createElement('div', 'draft-complete');

    const message = this.createElement('div', 'completion-message');
    message.textContent = 'Draft Complete!';
    container.appendChild(message);

    const btnContainer = this.createElement('div', 'flex-center');
    btnContainer.style.gap = '1rem';
    btnContainer.style.marginTop = '2rem';

    const viewBtn = this.createElement('button', ['btn-primary', 'btn-lg']);
    // Get player names for button text
    const draft = draftStore.draft;
    const buttonText = (draft && draft.players.length === 2)
      ? `View ${draft.players[0].name}-${draft.players[1].name} Comparison`
      : 'View Team Comparison';
    viewBtn.textContent = buttonText;
    viewBtn.addEventListener('click', () => {
      window.location.hash = '#/teams';
    });

    btnContainer.appendChild(viewBtn);
    container.appendChild(btnContainer);

    this.root.appendChild(container);
  }
}
