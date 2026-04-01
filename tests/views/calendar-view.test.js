// tests/views/calendar-view.test.js
// Unit tests for CalendarView — mocks module-level singletons

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarView } from '../../views/calendar-view.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDataStore, mockDraftStore } = vi.hoisted(() => ({
  mockDataStore: {
    loaded: true,
    season: 2026,
    data: {
      races: [],
      drivers: [],
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
      raceById: new Map(),
      driverById: new Map(),
      resultsByRace: new Map(),
      qualifyingByRace: new Map()
    },
    load: vi.fn().mockResolvedValue(true),
    setSeason: vi.fn(),
    getDriverSeasonSummary: vi.fn().mockReturnValue(null)
  },
  mockDraftStore: {
    currentSeason: 2026,
    draft: null,
    loadPlayerNames: vi.fn().mockReturnValue(null),
    loadCurrentSeason: vi.fn()
  }
}));

vi.mock('../../lib/data-store.js', () => ({ dataStore: mockDataStore }));
vi.mock('../../lib/draft-store.js', () => ({ draftStore: mockDraftStore }));

// ─── Test data ────────────────────────────────────────────────────────────────

const MOCK_RACES = [
  {
    raceId: '2026_01',
    raceName: 'Australian Grand Prix',
    round: 1,
    circuitId: 'albert_park',
    circuitName: 'Albert Park',
    locality: 'Melbourne',
    country: 'Australia',
    date: '2026-03-15',
    season: 2026,
    lat: '-37.8497',
    long: '144.968'
  },
  {
    raceId: '2026_02',
    raceName: 'Bahrain Grand Prix',
    round: 2,
    circuitId: 'bahrain',
    circuitName: 'Bahrain International Circuit',
    locality: 'Sakhir',
    country: 'Bahrain',
    date: '2026-03-29',
    season: 2026,
    lat: '26.0325',
    long: '50.5106'
  }
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarView', () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.season = 2026;
    mockDataStore.data.races = [...MOCK_RACES];
    mockDataStore.data.raceResults = [];
    mockDataStore.load.mockResolvedValue(true);
    mockDraftStore.currentSeason = 2026;

    view = new CalendarView();
    container = document.createElement('div');
  });

  // ─── Header ─────────────────────────────────────────────────────────────────

  describe('renderHeader', () => {
    it('renders the "Race Calendar" page title', async () => {
      await view.render(container, {});
      const title = container.querySelector('.page-title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('Race Calendar');
    });

    it('renders the season in the subtitle', async () => {
      await view.render(container, {});
      const subtitle = container.querySelector('.page-subtitle');
      expect(subtitle).not.toBeNull();
      expect(subtitle.textContent).toContain('2026');
    });

    it('renders a view switcher with Grid and Week buttons', async () => {
      await view.render(container, {});
      const buttons = container.querySelectorAll('.view-btn');
      expect(buttons.length).toBe(2);
      const labels = Array.from(buttons).map(b => b.textContent);
      expect(labels.some(l => l.includes('Grid'))).toBe(true);
      expect(labels.some(l => l.includes('Week'))).toBe(true);
    });

    it('has Grid View button active by default', async () => {
      await view.render(container, {});
      const buttons = container.querySelectorAll('.view-btn');
      const gridBtn = Array.from(buttons).find(b => b.textContent.includes('Grid'));
      expect(gridBtn.classList.contains('active')).toBe(true);
    });
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows empty state when races array is empty', async () => {
      mockDataStore.data.races = [];
      await view.render(container, {});
      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).not.toBeNull();
    });

    it('includes the season in the empty state message', async () => {
      mockDataStore.data.races = [];
      await view.render(container, {});
      expect(container.textContent).toContain('2026');
    });

    it('does not render world map when there are no races', async () => {
      mockDataStore.data.races = [];
      await view.render(container, {});
      expect(container.querySelector('.world-map-container')).toBeNull();
    });
  });

  // ─── Race data present ────────────────────────────────────────────────────

  describe('with race data', () => {
    it('renders the world map container when races exist', async () => {
      await view.render(container, {});
      expect(container.querySelector('.world-map-container')).not.toBeNull();
    });

    it('renders race cards for each race', async () => {
      await view.render(container, {});
      const raceCards = container.querySelectorAll('.race-card');
      expect(raceCards.length).toBe(MOCK_RACES.length);
    });

    it('race card contains the race name', async () => {
      await view.render(container, {});
      expect(container.textContent).toContain('Australian Grand Prix');
      expect(container.textContent).toContain('Bahrain Grand Prix');
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when data is not yet loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, {});
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });

    it('does not call dataStore.load() when data is already loaded', async () => {
      mockDataStore.loaded = true;
      await view.render(container, {});
      expect(mockDataStore.load).not.toHaveBeenCalled();
    });

    it('syncs season from draftStore when currentSeason is set', async () => {
      mockDraftStore.currentSeason = 2025;
      mockDataStore.loaded = false;
      await view.render(container, {});
      expect(mockDataStore.setSeason).toHaveBeenCalledWith(2025);
    });
  });

  // ─── View mode ────────────────────────────────────────────────────────────

  describe('viewMode', () => {
    it('defaults to grid view', () => {
      expect(view.viewMode).toBe('grid');
    });

    it('renders grid view container in default mode', async () => {
      await view.render(container, {});
      expect(container.querySelector('.calendar-grid')).not.toBeNull();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('empty state matches snapshot', async () => {
      mockDataStore.data.races = [];
      await view.render(container, {});
      expect(container.querySelector('.empty-state').outerHTML).toMatchSnapshot();
    });

    it('header matches snapshot', async () => {
      await view.render(container, {});
      expect(container.querySelector('.calendar-header').outerHTML).toMatchSnapshot();
    });
  });
});
