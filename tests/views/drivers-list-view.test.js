// tests/views/drivers-list-view.test.js
// Unit tests for DriversListView

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriversListView } from '../../views/drivers-list-view.js';

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
      driverById: new Map()
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

const MOCK_DRIVERS = [
  {
    driverId: 'max_verstappen',
    name: 'Max Verstappen',
    code: 'VER',
    team: 'Red Bull Racing',
    teamColor: '#3671C6',
    photoUrl: 'data/images/drivers/max_verstappen.jpg',
    number: '1',
    nationality: 'Dutch'
  },
  {
    driverId: 'charles_leclerc',
    name: 'Charles Leclerc',
    code: 'LEC',
    team: 'Ferrari',
    teamColor: '#E8002D',
    photoUrl: 'data/images/drivers/charles_leclerc.jpg',
    number: '16',
    nationality: 'Monegasque'
  },
  {
    driverId: 'lando_norris',
    name: 'Lando Norris',
    code: 'NOR',
    team: 'McLaren',
    teamColor: '#FF8000',
    photoUrl: 'data/images/drivers/lando_norris.jpg',
    number: '4',
    nationality: 'British'
  }
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DriversListView', () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.season = 2026;
    mockDataStore.data.drivers = [...MOCK_DRIVERS];
    mockDataStore.getDriverSeasonSummary.mockReturnValue(null);
    mockDraftStore.currentSeason = 2026;

    view = new DriversListView();
    container = document.createElement('div');
  });

  // ─── Header ─────────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders an h1 with "Drivers" text', async () => {
      await view.render(container, {});
      const title = container.querySelector('.page-title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('Drivers');
    });

    it('shows the current season in the subtitle', async () => {
      await view.render(container, {});
      const subtitle = container.querySelector('.page-subtitle');
      expect(subtitle.textContent).toContain('2026');
    });
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('renders an empty-state message when there are no drivers', async () => {
      mockDataStore.data.drivers = [];
      await view.render(container, {});
      expect(container.querySelector('.empty-state')).not.toBeNull();
    });

    it('does not render the drivers grid when empty', async () => {
      mockDataStore.data.drivers = [];
      await view.render(container, {});
      expect(container.querySelector('.drivers-grid')).toBeNull();
    });
  });

  // ─── Driver cards ─────────────────────────────────────────────────────────

  describe('driver cards', () => {
    it('renders a card for each driver', async () => {
      await view.render(container, {});
      const cards = container.querySelectorAll('.driver-card');
      expect(cards.length).toBe(MOCK_DRIVERS.length);
    });

    it('each card displays the driver name', async () => {
      await view.render(container, {});
      expect(container.textContent).toContain('Max Verstappen');
      expect(container.textContent).toContain('Charles Leclerc');
      expect(container.textContent).toContain('Lando Norris');
    });

    it('each card displays the driver code', async () => {
      await view.render(container, {});
      expect(container.textContent).toContain('VER');
      expect(container.textContent).toContain('LEC');
      expect(container.textContent).toContain('NOR');
    });

    it('each card displays the team name', async () => {
      await view.render(container, {});
      expect(container.textContent).toContain('Red Bull Racing');
      expect(container.textContent).toContain('Ferrari');
      expect(container.textContent).toContain('McLaren');
    });

    it('cards are wrapped in the drivers-grid container', async () => {
      await view.render(container, {});
      const grid = container.querySelector('.drivers-grid');
      expect(grid).not.toBeNull();
      const cards = grid.querySelectorAll('.driver-card');
      expect(cards.length).toBe(MOCK_DRIVERS.length);
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────

  describe('sorting by championship position', () => {
    it('places ranked drivers before unranked ones', async () => {
      mockDataStore.getDriverSeasonSummary.mockImplementation((season, driverId) => {
        if (driverId === 'max_verstappen') return { position: 1, points: 200 };
        if (driverId === 'charles_leclerc') return { position: 2, points: 170 };
        return null; // norris unranked
      });

      await view.render(container, {});
      const cards = container.querySelectorAll('.driver-card');
      const names = Array.from(cards).map(c => c.querySelector('.driver-name').textContent);

      // Ranked drivers first
      expect(names.indexOf('Max Verstappen')).toBeLessThan(names.indexOf('Lando Norris'));
      expect(names.indexOf('Charles Leclerc')).toBeLessThan(names.indexOf('Lando Norris'));
    });

    it('orders ranked drivers by championship position ascending', async () => {
      mockDataStore.getDriverSeasonSummary.mockImplementation((season, driverId) => {
        if (driverId === 'max_verstappen') return { position: 1, points: 200 };
        if (driverId === 'charles_leclerc') return { position: 2, points: 170 };
        if (driverId === 'lando_norris') return { position: 3, points: 150 };
        return null;
      });

      await view.render(container, {});
      const names = Array.from(container.querySelectorAll('.driver-name')).map(n => n.textContent);
      expect(names[0]).toBe('Max Verstappen');
      expect(names[1]).toBe('Charles Leclerc');
      expect(names[2]).toBe('Lando Norris');
    });
  });

  // ─── Navigation ──────────────────────────────────────────────────────────

  describe('navigation on card click', () => {
    it('cards have pointer cursor style', async () => {
      await view.render(container, {});
      const card = container.querySelector('.driver-card');
      expect(card.style.cursor).toBe('pointer');
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when not yet loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, {});
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });

    it('skips dataStore.load() when already loaded', async () => {
      await view.render(container, {});
      expect(mockDataStore.load).not.toHaveBeenCalled();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('driver card structure matches snapshot', async () => {
      mockDataStore.data.drivers = [MOCK_DRIVERS[0]];
      await view.render(container, {});
      expect(container.querySelector('.driver-card').outerHTML).toMatchSnapshot();
    });

    it('empty state matches snapshot', async () => {
      mockDataStore.data.drivers = [];
      await view.render(container, {});
      expect(container.querySelector('.empty-state').outerHTML).toMatchSnapshot();
    });
  });
});
