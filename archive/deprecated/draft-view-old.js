// views/draft-view.js
// Draft view for fantasy league

import { BaseView } from './base-view.js';
import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';
import { DEFAULT_DRAFT_CONFIG, DRAFT_STATUS, DRAFT_TYPES } from '../lib/draft-config.js';

export class DraftView extends BaseView {
  constructor() {
    super();
    this.unsubscribe = null;
    this.searchQuery = '';
  }

  async render(container, params) {
    this.root = container;

    // Subscribe to draft state changes
    this.unsubscribe = draftStore.subscribe(() => this.update());

    // Try to load existing draft
    draftStore.loadDraft();

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

    const config = {
      rosterSize,
      draftType,
      playerCount: 2,
      allowDuplicates: false,
      season: 2024
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

      const currentTurn = this.createElement('div', 'current-turn');
      currentTurn.innerHTML = `
        <p>Round ${round}</p>
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
        const pick = draft.picks.find(p => p.driverId === driverId);

        const item = this.createElement('li', 'roster-item');
        item.innerHTML = `
          <span class="roster-number">${idx + 1}.</span>
          <span class="driver-name">${driverId}</span>
          <span class="pick-info">(R${pick.round})</span>
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

    const draftedDrivers = draftStore.getDraftedDrivers();
    const availableDrivers = dataStore.getMockDrivers().filter(d => !draftedDrivers.includes(d.driverId));

    const grid = this.createElement('div', 'drivers-grid');

    availableDrivers.forEach(driver => {
      const card = this.createElement('div', 'driver-card');
      card.innerHTML = `
        <div class="driver-code">${driver.code}</div>
        <div class="driver-full-name">${driver.name}</div>
        <div class="driver-team">${driver.team}</div>
        <button class="pick-btn" data-driver-id="${driver.driverId}">PICK</button>
      `;

      const btn = card.querySelector('.pick-btn');
      btn.addEventListener('click', () => this.handlePick(driver.driverId));

      grid.appendChild(card);
    });

    section.appendChild(grid);
    this.root.appendChild(section);
  }

  handlePick(driverId) {
    const result = draftStore.makePick(driverId);

    if (!result.success) {
      alert(`Cannot pick driver: ${result.error}`);
    }
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
        const item = this.createElement('li', 'roster-item');
        item.textContent = `${idx + 1}. ${driverId}`;
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

    const viewTeamsBtn = this.createElement('button', 'btn-secondary', 'View Team Comparison');
    viewTeamsBtn.addEventListener('click', () => {
      window.location.hash = '#/teams';
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
