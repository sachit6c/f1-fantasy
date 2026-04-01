// views/draft-view.js
// Updated draft view with auto-pairing and side-by-side panels

import { BaseView } from './base-view.js';
import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';
import { createDraftConfig } from '../lib/draft-config.js';

export class DraftView extends BaseView {
  async render(container, params) {


 this.root = container;

    // Load data
    if (!dataStore.loaded) {
      await dataStore.load();
    }

    // Try to load saved player names
    const savedNames = draftStore.loadPlayerNames();

    // Try to load existing draft
    const draftLoaded = draftStore.loadDraft();

    if (draftLoaded && draftStore.draft) {
      // Resume existing draft
      this.renderExistingDraft();
    } else if (savedNames) {
      // Auto-start new draft with saved names
      this.startNewDraft(savedNames.player1, savedNames.player2);
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

    const subtitle = this.createElement('p', 'text-center', 'Enter player names to begin');
    subtitle.style.marginBottom = '2rem';
    card.appendChild(subtitle);

    // Form
    const form = this.createElement('form', 'setup-form');
    form.addEventListener('submit', (e) => this.handleSetupSubmit(e));

    // Player 1
    const p1Group = this.createElement('div', 'form-group');
    const p1Label = this.createElement('label', [], 'Player 1 Name');
    const p1Input = this.createElement('input');
    p1Input.type = 'text';
    p1Input.name = 'player1';
    p1Input.required = true;
    p1Input.placeholder = 'Enter Player 1 name';
    p1Group.appendChild(p1Label);
    p1Group.appendChild(p1Input);

    // Player 2
    const p2Group = this.createElement('div', 'form-group');
    const p2Label = this.createElement('label', [], 'Player 2 Name');
    const p2Input = this.createElement('input');
    p2Input.type = 'text';
    p2Input.name = 'player2';
    p2Input.required = true;
    p2Input.placeholder = 'Enter Player 2 name';
    p2Group.appendChild(p2Label);
    p2Group.appendChild(p2Input);

    form.appendChild(p1Group);
    form.appendChild(p2Group);

    // Info text
    const info = this.createElement('p', 'text-secondary text-center');
    const teamCount = dataStore.getTeamCount();
    info.textContent = `You'll draft ${teamCount} teams (${teamCount * 2} drivers total) using Snake draft`;
    info.style.margin = '1.5rem 0';
    form.appendChild(info);

    // Submit button
    const submitBtn = this.createElement('button', 'btn-primary');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Start Draft';
    submitBtn.style.width = '100%';
    submitBtn.style.padding = '1rem';
    submitBtn.style.fontSize = '1.125rem';
    form.appendChild(submitBtn);

    card.appendChild(form);
    container.appendChild(card);
    this.root.appendChild(container);
  }

  handleSetupSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const player1 = formData.get('player1').trim();
    const player2 = formData.get('player2').trim();

    if (!player1 || !player2) {
      alert('Please enter both player names');
      return;
    }

    // Save player names
    draftStore.savePlayerNames(player1, player2);

    // Start new draft
    this.startNewDraft(player1, player2);
  }

  startNewDraft(player1Name, player2Name) {
    const config = createDraftConfig(dataStore);

    const players = [
      { name: player1Name, draftOrder: 0 },
      { name: player2Name, draftOrder: 1 }
    ];

    draftStore.createDraft(config, players);
    draftStore.startDraft();

    this.renderExistingDraft();
  }

  renderExistingDraft() {
    const draft = draftStore.draft;

    if (draft.status === 'completed') {
      this.renderDraftComplete();
      return;
    }

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
    progressText.textContent = `Pick ${progress.picksMade + 1} of ${progress.totalPicks}`;
    status.appendChild(progressText);

    header.appendChild(status);

    // Progress bar
    const progressBar = this.createElement('div', 'draft-progress');
    const progressLabel = this.createElement('div', 'progress-label');
    progressLabel.innerHTML = `<span>Progress</span><span>${progress.percentComplete}%</span>`;
    progressBar.appendChild(progressLabel);

    const barContainer = this.createElement('div', 'progress-bar');
    const barFill = this.createElement('div', 'progress-fill');
    barFill.style.width = `${progress.percentComplete}%`;
    barContainer.appendChild(barFill);
    progressBar.appendChild(barContainer);

    header.appendChild(progressBar);

    this.root.appendChild(header);
  }

  renderPlayerPanel(player, playerIndex) {
    const currentPlayer = draftStore.getCurrentPlayer();
    const isActive = currentPlayer && currentPlayer.playerId === player.playerId;

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
      player.roster.forEach(driverId => {
        const driver = dataStore.indexes.driverById.get(driverId);
        if (!driver) return;

        const driverEl = this.createElement('div', 'roster-driver-new');
        driverEl.innerHTML = `
          <div class="driver-code-small">${driver.code}</div>
          <div class="driver-details-small">
            <div class="driver-name-small">${driver.name}</div>
            <div class="driver-team-small">${driver.team}</div>
          </div>
        `;
        roster.appendChild(driverEl);
      });
    }

    panel.appendChild(roster);

    return panel;
  }

  renderDraftArea() {
    const area = this.createElement('div', 'draft-area-new');

    const heading = this.createElement('h3', 'draft-area-heading', 'Select a Team');
    area.appendChild(heading);

    const instructions = this.createElement('p', 'draft-instructions');
    instructions.textContent = 'Click any driver to select them. Their teammate will be automatically assigned to the other player.';
    area.appendChild(instructions);

    // Group drivers by team
    const driversByTeam = dataStore.getDriversByTeam();
    const draftedDrivers = draftStore.getDraftedDrivers();

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
      teamCard.appendChild(teamHeader);

      drivers.forEach(driver => {
        const isDrafted = draftedDrivers.includes(driver.driverId);
        const driverCard = this.createElement('div', ['team-driver-card-new', isDrafted ? 'picked' : '']);

        driverCard.innerHTML = `
          <div class="driver-code-large">${driver.code}</div>
          <div class="driver-name-medium">${driver.name}</div>
          ${isDrafted ? '<div class="picked-indicator">PICKED</div>' : ''}
        `;

        if (!isDrafted) {
          driverCard.addEventListener('click', () => this.handlePick(driver.driverId));
        }

        teamCard.appendChild(driverCard);
      });

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

    // Check if draft completed
    if (draftStore.draft.status === 'completed') {
      // Auto-navigate to team comparison
      setTimeout(() => {
        window.location.hash = '#/teams';
      }, 1000);
    } else {
      // Re-render to show updated state
      this.renderExistingDraft();
    }
  }

  renderDraftActions() {
    const actions = this.createElement('div', 'draft-actions');

    const newSeasonBtn = this.createElement('button', 'btn-danger');
    newSeasonBtn.textContent = 'New Season';
    newSeasonBtn.addEventListener('click', () => {
      if (confirm('Start a new season? This will clear all data including player names.')) {
        draftStore.clearAll();
        window.location.reload();
      }
    });

    actions.appendChild(newSeasonBtn);

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

    const viewBtn = this.createElement('button', 'btn-primary btn-lg');
    viewBtn.textContent = 'View Team Comparison';
    viewBtn.addEventListener('click', () => {
      window.location.hash = '#/teams';
    });

    const newSeasonBtn = this.createElement('button', 'btn-danger');
    newSeasonBtn.textContent = 'New Season';
    newSeasonBtn.addEventListener('click', () => {
      if (confirm('Start a new season? This will clear all data.')) {
        draftStore.clearAll();
        window.location.reload();
      }
    });

    btnContainer.appendChild(viewBtn);
    btnContainer.appendChild(newSeasonBtn);
    container.appendChild(btnContainer);

    this.root.appendChild(container);

    // Auto-navigate after 2 seconds
    setTimeout(() => {
      window.location.hash = '#/teams';
    }, 2000);
  }
}
