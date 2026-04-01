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
    it('does not render the setup form when a draft is active', async () => {
      mockDraftStore.draft = {
        status: 'in_progress',
        season: 2026,
        players: [
          { playerId: 'player_1', name: 'Alice', roster: [], draftOrder: 0 },
          { playerId: 'player_2', name: 'Bob', roster: [], draftOrder: 1 }
        ],
        picks: [],
        currentPickIndex: 0,
        config: { rounds: 5, season: 2026, driversPerTeam: 5 }
      };

      await view.render(container, {});
      expect(container.querySelector('.setup-form')).toBeNull();
    });
  });
});
