// tests/views/team-comparison-view.test.js
// Unit tests for TeamComparisonView

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamComparisonView } from '../../views/team-comparison-view.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDataStore, mockDraftStore, mockFantasyTeamScorer } = vi.hoisted(() => ({
  mockDataStore: {
    loaded: true,
    season: 2026,
    data: {
      races: [],
      drivers: [
        { driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER', team: 'Red Bull Racing', teamColor: '#3671C6', points: 200 },
        { driverId: 'charles_leclerc', name: 'Charles Leclerc', code: 'LEC', team: 'Ferrari', teamColor: '#E8002D', points: 170 }
      ],
      constructors: [
        { constructorId: 'red_bull', name: 'Red Bull Racing', teamColor: '#3671C6' },
        { constructorId: 'ferrari', name: 'Ferrari', teamColor: '#E8002D' }
      ],
      driverTeams: [],
      qualifying: [],
      raceResults: [],
      sprintResults: [],
      driverSeasonSummary: [
        { driverId: 'max_verstappen', season: 2026, position: 1, points: 200, wins: 5 },
        { driverId: 'charles_leclerc', season: 2026, position: 2, points: 170, wins: 3 }
      ],
      driverCareerSummary: [],
      constructorSeasonSummary: [
        { constructorId: 'red_bull', season: 2026, position: 1, points: 260 },
        { constructorId: 'ferrari', season: 2026, position: 2, points: 260 }
      ]
    },
    indexes: {
      raceById: new Map(),
      driverById: new Map(),
      constructorById: new Map([
        ['red_bull', { constructorId: 'red_bull', name: 'Red Bull Racing', teamColor: '#3671C6' }],
        ['ferrari', { constructorId: 'ferrari', name: 'Ferrari', teamColor: '#E8002D' }]
      ]),
      resultsByRace: new Map(),
      qualifyingByRace: new Map()
    },
    load: vi.fn().mockResolvedValue(true),
    setSeason: vi.fn(),
    getDriverSeasonSummary: vi.fn().mockReturnValue(null),
    getRace: vi.fn().mockReturnValue(null),
    getRaceResults: vi.fn().mockReturnValue([]),
    getConstructorLogoUrl: vi.fn().mockReturnValue('')
  },
  mockDraftStore: {
    currentSeason: 2026,
    draft: null,
    loadPlayerNames: vi.fn().mockReturnValue(null),
    loadCurrentSeason: vi.fn()
  },
  mockFantasyTeamScorer: {
    compareTeams: vi.fn().mockReturnValue({
      player1: { name: 'Alice', totalPoints: 100, raceBreakdown: [] },
      player2: { name: 'Bob', totalPoints: 80, raceBreakdown: [] },
      headToHead: []
    })
  }
}));

vi.mock('../../lib/data-store.js', () => ({ dataStore: mockDataStore }));
vi.mock('../../lib/draft-store.js', () => ({ draftStore: mockDraftStore }));
vi.mock('../../lib/fantasy-team-scorer.js', () => ({ fantasyTeamScorer: mockFantasyTeamScorer }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TeamComparisonView', () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.season = 2026;
    mockDraftStore.draft = null;
    mockDraftStore.currentSeason = 2026;

    view = new TeamComparisonView();
    container = document.createElement('div');
  });

  // ─── Header ─────────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders the "Teams & Standings" page title', async () => {
      await view.render(container, {});
      expect(container.querySelector('.page-title').textContent).toBe('Teams & Standings');
    });
  });

  // ─── Tab navigation ───────────────────────────────────────────────────────

  describe('tab navigation', () => {
    it('renders exactly 3 tab buttons', async () => {
      await view.render(container, {});
      expect(container.querySelectorAll('.tab-btn').length).toBe(3);
    });

    it('renders the Driver Standings tab', async () => {
      await view.render(container, {});
      const labels = Array.from(container.querySelectorAll('.tab-btn')).map(b => b.textContent);
      expect(labels.some(l => l.includes('Driver Standings'))).toBe(true);
    });

    it('renders the Constructor Standings tab', async () => {
      await view.render(container, {});
      const labels = Array.from(container.querySelectorAll('.tab-btn')).map(b => b.textContent);
      expect(labels.some(l => l.includes('Constructor Standings'))).toBe(true);
    });

    it('renders a Team Comparison tab', async () => {
      await view.render(container, {});
      const labels = Array.from(container.querySelectorAll('.tab-btn')).map(b => b.textContent);
      expect(labels.some(l => l.includes('Comparison'))).toBe(true);
    });

    it('disables the Team Comparison tab when there is no completed draft', async () => {
      await view.render(container, {});
      const comparisonBtn = Array.from(container.querySelectorAll('.tab-btn'))
        .find(b => b.textContent.includes('Comparison'));
      expect(comparisonBtn.disabled).toBe(true);
    });

    it('enables the Team Comparison tab when draft is completed', async () => {
      mockDraftStore.draft = {
        status: 'completed',
        players: [
          { playerId: 'player_1', name: 'Alice', roster: [] },
          { playerId: 'player_2', name: 'Bob', roster: [] }
        ]
      };
      await view.render(container, {});
      const comparisonBtn = Array.from(container.querySelectorAll('.tab-btn'))
        .find(b => b.textContent.includes('Comparison'));
      expect(comparisonBtn.disabled).toBe(false);
    });

    it('includes player names in comparison tab label for completed draft', async () => {
      mockDraftStore.draft = {
        status: 'completed',
        players: [
          { playerId: 'player_1', name: 'Alice', roster: [] },
          { playerId: 'player_2', name: 'Bob', roster: [] }
        ]
      };
      await view.render(container, {});
      const labels = Array.from(container.querySelectorAll('.tab-btn')).map(b => b.textContent);
      expect(labels.some(l => l.includes('Alice') && l.includes('Bob'))).toBe(true);
    });
  });

  // ─── Tab panels ───────────────────────────────────────────────────────────

  describe('tab panels', () => {
    it('renders 3 tab panels', async () => {
      await view.render(container, {});
      expect(container.querySelectorAll('.tab-panel').length).toBe(3);
    });

    it('shows "no draft" message in comparison panel when no draft', async () => {
      view.currentTab = 'driver-standings'; // doesn't matter, comparison panel is always rendered
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel).not.toBeNull();
      expect(compPanel.textContent).toContain('completed draft');
    });

    it('comparison panel provides link to draft page when no draft', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.querySelector('a[href="#/draft"]')).not.toBeNull();
    });

    it('driver standings panel is rendered', async () => {
      await view.render(container, {});
      expect(container.querySelector('#tab-driver-standings')).not.toBeNull();
    });

    it('constructor standings panel is rendered', async () => {
      await view.render(container, {});
      expect(container.querySelector('#tab-constructor-standings')).not.toBeNull();
    });
  });

  // ─── Default tab ─────────────────────────────────────────────────────────

  describe('default tab selection', () => {
    it('defaults to driver-standings when no draft exists', async () => {
      await view.render(container, {});
      expect(view.currentTab).toBe('driver-standings');
    });

    it('defaults to comparison when draft is completed', async () => {
      mockDraftStore.draft = {
        status: 'completed',
        players: [
          { playerId: 'player_1', name: 'Alice', roster: [] },
          { playerId: 'player_2', name: 'Bob', roster: [] }
        ]
      };
      await view.render(container, {});
      expect(view.currentTab).toBe('comparison');
    });
  });

  // ─── getDriverColor ───────────────────────────────────────────────────────

  describe('getDriverColor', () => {
    it('returns a valid hex string', () => {
      const color = view.getDriverColor('#3671C6', 0);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('returns different colors for index 0 and index 1', () => {
      const c0 = view.getDriverColor('#3671C6', 0);
      const c1 = view.getDriverColor('#3671C6', 1);
      expect(c0).not.toBe(c1);
    });

    it('color for index 0 (first driver) is darker than for index 1', () => {
      const c0 = view.getDriverColor('#3671C6', 0);
      const c1 = view.getDriverColor('#3671C6', 1);
      // Simple luminance check: sum of RGB channels
      const sum = hex => {
        const h = hex.replace('#', '');
        return parseInt(h.substr(0, 2), 16) + parseInt(h.substr(2, 2), 16) + parseInt(h.substr(4, 2), 16);
      };
      expect(sum(c0)).toBeLessThan(sum(c1));
    });

    it('handles grayscale (achromatic) team colors', () => {
      const color = view.getDriverColor('#808080', 0);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when not yet loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, {});
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });

    it('skips load when already loaded and qualifying data is consistent', async () => {
      mockDataStore.loaded = true;
      mockDataStore.data.raceResults = [];
      mockDataStore.data.qualifying = [];
      await view.render(container, {});
      expect(mockDataStore.load).not.toHaveBeenCalled();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('tab navigation matches snapshot', async () => {
      await view.render(container, {});
      expect(container.querySelector('.tab-navigation').outerHTML).toMatchSnapshot();
    });
  });
});
