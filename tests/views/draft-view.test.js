// tests/views/draft-view.test.js
// Unit tests for DraftView — setup form and basic render logic

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DraftView } from '../../views/draft-view.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDataStore, mockDraftStore } = vi.hoisted(() => ({
  mockDataStore: {
    loaded: true,
    season: 2026,
    data: {
      races: [],
      drivers: [
        {
          driverId: 'max_verstappen',
          name: 'Max Verstappen',
          code: 'VER',
          team: 'Red Bull Racing',
          teamColor: '#3671C6',
          photoUrl: 'data/images/drivers/max_verstappen.jpg',
          number: '1',
          nationality: 'Dutch'
        }
      ],
      constructors: [],
      driverTeams: [],
      qualifying: [],
      raceResults: [],
      sprintResults: [],
      driverSeasonSummary: [],
      driverCareerSummary: [],
      constructorSeasonSummary: []
    },
    indexes: {
      driverById: new Map(),
      constructorById: new Map()
    },
    load: vi.fn().mockResolvedValue(true),
    setSeason: vi.fn(),
    getTeammates: vi.fn().mockReturnValue([]),
    getDriversByTeam: vi.fn().mockReturnValue(new Map())
  },
  mockDraftStore: {
    currentSeason: 2026,
    draft: null,
    loadPlayerNames: vi.fn().mockReturnValue(null),
    loadCurrentSeason: vi.fn(),
    loadDraft: vi.fn(),
    createDraft: vi.fn(),
    startDraft: vi.fn(),
    addListener: vi.fn(),
    getCurrentPlayer: vi.fn().mockReturnValue(null),
    getProgress: vi.fn().mockReturnValue({ picksMade: 0, totalPicks: 10 }),
    getDraftedDrivers: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../../lib/data-store.js', () => ({ dataStore: mockDataStore }));
vi.mock('../../lib/draft-store.js', () => ({ draftStore: mockDraftStore }));
vi.mock('../../lib/draft-config.js', () => ({
  createDraftConfig: vi.fn().mockReturnValue({ season: 2026, rounds: 5 }),
  DRAFT_TYPE_META: {
    snake:        { label: 'Snake Draft',        description: 'Order reverses each round: A→B→B→A→A→B…' },
    linear:       { label: 'Linear Draft',       description: 'Same order every round: A→B→A→B…' },
    random_snake: { label: 'Random Snake',       description: 'Coin-flip decides who picks first, then snakes' },
    full_pick:    { label: 'Player 1 Picks All', description: 'Player 1 chooses all their drivers; Player 2 gets all teammates' }
  },
  DRAFT_STATUS: { SETUP: 'setup', IN_PROGRESS: 'in_progress', COMPLETED: 'completed' }
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DraftView', () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftStore.draft = null;
    mockDraftStore.loadPlayerNames.mockReturnValue(null);
    mockDraftStore.currentSeason = 2026;
    mockDataStore.loaded = true;

    view = new DraftView();
    container = document.createElement('div');
  });

  // ─── Setup form (no draft, no saved names) ─────────────────────────────────

  describe('renderSetup — first time experience', () => {
    it('renders the draft setup container', async () => {
      await view.render(container, {});
      expect(container.querySelector('.draft-setup')).not.toBeNull();
    });

    it('renders the "F1 Fantasy League" page title', async () => {
      await view.render(container, {});
      expect(container.querySelector('.page-title').textContent).toBe('F1 Fantasy League');
    });

    it('renders the setup form', async () => {
      await view.render(container, {});
      expect(container.querySelector('.setup-form')).not.toBeNull();
    });

    it('includes a Player 1 input', async () => {
      await view.render(container, {});
      const input = container.querySelector('input[name="player1"]');
      expect(input).not.toBeNull();
      expect(input.type).toBe('text');
    });

    it('includes a Player 2 input', async () => {
      await view.render(container, {});
      const input = container.querySelector('input[name="player2"]');
      expect(input).not.toBeNull();
    });

    it('renders the "Start Draft" submit button', async () => {
      await view.render(container, {});
      const btn = container.querySelector('button[type="submit"]');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('Start Draft');
    });

    it('Player 1 and Player 2 labels are present', async () => {
      await view.render(container, {});
      const labels = Array.from(container.querySelectorAll('label')).map(l => l.textContent);
      expect(labels).toContain('Player 1');
      expect(labels).toContain('Player 2');
    });
  });

  // ─── Pre-filled with saved names ─────────────────────────────────────────

  describe('setup form with saved player names', () => {
    it('auto-starts the draft (no setup form) when saved names exist', async () => {
      mockDraftStore.loadPlayerNames.mockReturnValue({ player1: 'Alice', player2: 'Bob' });
      mockDraftStore.draft = null;

      await view.render(container, {});
      // With saved names, startNewDraft() is called instead of renderSetup(),
      // so the setup form is NOT rendered
      expect(container.querySelector('.setup-form')).toBeNull();
    });

    it('triggers data load with the current season when saved names exist', async () => {
      mockDraftStore.loadPlayerNames.mockReturnValue({ player1: 'Alice', player2: 'Bob' });
      mockDraftStore.draft = null;

      await view.render(container, {});
      expect(mockDataStore.setSeason).toHaveBeenCalledWith(2026);
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('setup form matches snapshot', async () => {
      await view.render(container, {});
      expect(container.querySelector('.draft-setup').outerHTML).toMatchSnapshot();
    });
  });

  // ─── Routing to existing draft ─────────────────────────────────────────────

  describe('when draft already exists', () => {
    const makeDraft = (status = 'in_progress', roster1 = [], roster2 = [], picks = []) => ({
      status,
      season: 2026,
      players: [
        { playerId: 'player_1', name: 'Alice', roster: roster1, draftOrder: 0 },
        { playerId: 'player_2', name: 'Bob', roster: roster2, draftOrder: 1 }
      ],
      picks,
      currentPickIndex: picks.length,
      config: { rosterSize: 5, season: 2026 }
    });

    it('does not render the setup form when a draft is active', async () => {
      mockDraftStore.draft = makeDraft();
      await view.render(container, {});
      expect(container.querySelector('.setup-form')).toBeNull();
    });

    it('renders a draft-header when in-progress', async () => {
      mockDraftStore.draft = makeDraft();
      mockDraftStore.getCurrentPlayer.mockReturnValue({ playerId: 'player_1', name: 'Alice' });
      await view.render(container, {});
      expect(container.querySelector('.draft-header')).not.toBeNull();
      expect(container.textContent).toContain("Alice's turn to pick");
    });

    it('renders draft-content-new side-by-side panels', async () => {
      mockDraftStore.draft = makeDraft();
      await view.render(container, {});
      expect(container.querySelector('.draft-content-new')).not.toBeNull();
      expect(container.querySelectorAll('.player-panel-new').length).toBe(2);
    });

    it('renders roster drivers when roster contains known drivers', async () => {
      const verDriver = {
        driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER',
        team: 'Red Bull Racing', teamColor: '#3671C6',
        photoUrl: 'data/images/drivers/max_verstappen.jpg', number: 1
      };
      mockDataStore.indexes.driverById = new Map([['max_verstappen', verDriver]]);
      const picks = [{ driverId: 'max_verstappen', playerId: 'player_1', autoPicked: false }];
      mockDraftStore.draft = makeDraft('in_progress', ['max_verstappen'], [], picks);
      mockDraftStore.getDraftedDrivers.mockReturnValue(['max_verstappen']);

      await view.render(container, {});
      expect(container.querySelector('.roster-driver-new')).not.toBeNull();
      expect(container.textContent).toContain('VER');
    });

    it('marks auto-picked roster drivers with AUTO badge', async () => {
      const perDriver = {
        driverId: 'sergio_perez', name: 'Sergio Perez', code: 'PER',
        team: 'Red Bull Racing', teamColor: '#3671C6',
        photoUrl: 'data/images/drivers/sergio_perez.jpg', number: 11
      };
      mockDataStore.indexes.driverById = new Map([['sergio_perez', perDriver]]);
      const picks = [{ driverId: 'sergio_perez', playerId: 'player_2', autoPicked: true }];
      mockDraftStore.draft = makeDraft('in_progress', [], ['sergio_perez'], picks);
      mockDraftStore.getDraftedDrivers.mockReturnValue(['sergio_perez']);

      await view.render(container, {});
      expect(container.querySelector('.auto-picked')).not.toBeNull();
      expect(container.innerHTML).toContain('AUTO');
    });

    it('renders team cards in draft area when getDriversByTeam returns teams', async () => {
      const verDriver = {
        driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER',
        team: 'Red Bull Racing', teamColor: '#3671C6',
        photoUrl: 'data/images/drivers/max_verstappen.jpg', number: 1
      };
      const teamsMap = new Map([['Red Bull Racing', [verDriver]]]);
      mockDataStore.getDriversByTeam.mockReturnValue(teamsMap);
      mockDraftStore.getDraftedDrivers.mockReturnValue([]);
      mockDraftStore.draft = makeDraft();

      await view.render(container, {});
      expect(container.querySelector('.team-card-new')).not.toBeNull();
      expect(container.textContent).toContain('Red Bull Racing');
    });

    it('marks team as drafted when one of its drivers is picked', async () => {
      const verDriver = {
        driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER',
        team: 'Red Bull Racing', teamColor: '#3671C6',
        photoUrl: 'data/images/drivers/max_verstappen.jpg', number: 1
      };
      mockDataStore.getDriversByTeam.mockReturnValue(new Map([['Red Bull Racing', [verDriver]]]));
      mockDraftStore.getDraftedDrivers.mockReturnValue(['max_verstappen']);
      mockDraftStore.draft = makeDraft('in_progress', ['max_verstappen'], [], [
        { driverId: 'max_verstappen', playerId: 'player_1', autoPicked: false }
      ]);

      await view.render(container, {});
      const teamCard = container.querySelector('.team-card-new');
      expect(teamCard.classList.contains('drafted')).toBe(true);
    });

    it('shows "Draft in progress" when there is no current player', async () => {
      mockDraftStore.draft = makeDraft();
      mockDraftStore.getCurrentPlayer.mockReturnValue(null);
      await view.render(container, {});
      expect(container.textContent).toContain('Draft in progress');
    });

    it('shows "Draft Complete" in pick counter when all picks are made', async () => {
      mockDraftStore.draft = makeDraft();
      mockDraftStore.getProgress.mockReturnValue({ picksMade: 10, totalPicks: 10 });
      await view.render(container, {});
      expect(container.textContent).toContain('Draft Complete');
    });

    it('renders the Confirm Draft action button', async () => {
      mockDraftStore.draft = makeDraft();
      await view.render(container, {});
      const confirmBtn = Array.from(container.querySelectorAll('button'))
        .find(b => b.textContent === 'Confirm Draft');
      expect(confirmBtn).not.toBeNull();
    });
  });

  // ─── renderDraftComplete ──────────────────────────────────────────────────

  describe('renderDraftComplete()', () => {
    it('renders draft-complete container with completion message', () => {
      mockDraftStore.draft = {
        players: [{ name: 'Alice' }, { name: 'Bob' }]
      };
      document.body.appendChild(container);
      view.root = container;
      view.renderDraftComplete();
      expect(container.querySelector('.draft-complete')).not.toBeNull();
      expect(container.textContent).toContain('Draft Complete');
      document.body.removeChild(container);
    });

    it('includes a view comparison button with player names', () => {
      mockDraftStore.draft = {
        players: [{ name: 'Alice' }, { name: 'Bob' }]
      };
      document.body.appendChild(container);
      view.root = container;
      view.renderDraftComplete();
      const btn = container.querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toContain('Alice');
      expect(btn.textContent).toContain('Bob');
      document.body.removeChild(container);
    });
  });

  // ─── handleSetupSubmit ────────────────────────────────────────────────────

  describe('handleSetupSubmit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mockDraftStore.savePlayerNames = vi.fn();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls startNewDraft when form is submitted with player names', async () => {
      await view.render(container, {});

      const input1 = container.querySelector('input[name="player1"]');
      const input2 = container.querySelector('input[name="player2"]');
      input1.value = 'Alice';
      input2.value = 'Bob';

      const form = container.querySelector('.setup-form');
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      // Let dataStore.load() promise resolve (microtask)
      await Promise.resolve();
      await Promise.resolve();

      expect(mockDraftStore.savePlayerNames).toHaveBeenCalledWith('Alice', 'Bob', 'snake');
    });

    it('uses default player names when inputs are empty', async () => {
      await view.render(container, {});

      const form = container.querySelector('.setup-form');
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      await Promise.resolve();
      await Promise.resolve();

      expect(mockDraftStore.savePlayerNames).toHaveBeenCalledWith('Player 1', 'Player 2', 'snake');
    });
  });
});
