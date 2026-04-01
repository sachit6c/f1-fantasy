// tests/views/constructors-list-view.test.js
// Unit tests for ConstructorsListView

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConstructorsListView } from '../../views/constructors-list-view.js';

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
      constructorById: new Map()
    },
    load: vi.fn().mockResolvedValue(true),
    setSeason: vi.fn(),
    getConstructorLogoWithFallback: vi.fn().mockReturnValue({
      primary: 'data/images/constructors/red_bull.png',
      fallback1: 'data/images/constructors/red_bull.jpg',
      fallback2: 'data/images/constructors/red_bull.svg'
    })
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

const MOCK_CONSTRUCTORS = [
  {
    constructorId: 'red_bull',
    name: 'Red Bull Racing',
    nationality: 'Austrian',
    teamColor: '#3671C6',
    logoUrl: 'data/images/constructors/red_bull.png'
  },
  {
    constructorId: 'ferrari',
    name: 'Ferrari',
    nationality: 'Italian',
    teamColor: '#E8002D',
    logoUrl: 'data/images/constructors/ferrari.png'
  },
  {
    constructorId: 'mclaren',
    name: 'McLaren',
    nationality: 'British',
    teamColor: '#FF8000',
    logoUrl: null
  }
];

const MOCK_STANDINGS = [
  { constructorId: 'ferrari', position: 1, points: 260 },
  { constructorId: 'red_bull', position: 2, points: 240 }
  // mclaren has no standing entry
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConstructorsListView', () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.season = 2026;
    mockDataStore.data.constructors = [...MOCK_CONSTRUCTORS];
    mockDataStore.data.drivers = [];
    mockDataStore.data.constructorSeasonSummary = [...MOCK_STANDINGS];
    mockDraftStore.currentSeason = 2026;

    view = new ConstructorsListView();
    container = document.createElement('div');
  });

  // ─── Header ─────────────────────────────────────────────────────────────────

  describe('header', () => {
    it('renders the page title as "Constructors"', async () => {
      await view.render(container, {});
      expect(container.querySelector('.page-title').textContent).toBe('Constructors');
    });

    it('includes the current season in the subtitle', async () => {
      await view.render(container, {});
      expect(container.querySelector('.page-subtitle').textContent).toContain('2026');
    });
  });

  // ─── Empty state ──────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows an empty-state element when no constructors', async () => {
      mockDataStore.data.constructors = [];
      await view.render(container, {});
      expect(container.querySelector('.empty-state')).not.toBeNull();
    });

    it('does not render the constructors grid when empty', async () => {
      mockDataStore.data.constructors = [];
      await view.render(container, {});
      expect(container.querySelector('.constructors-grid')).toBeNull();
    });
  });

  // ─── Constructor cards ────────────────────────────────────────────────────

  describe('constructor cards', () => {
    it('renders one card per constructor', async () => {
      await view.render(container, {});
      const cards = container.querySelectorAll('.constructor-card');
      expect(cards.length).toBe(MOCK_CONSTRUCTORS.length);
    });

    it('each card shows the constructor name', async () => {
      await view.render(container, {});
      expect(container.textContent).toContain('Red Bull Racing');
      expect(container.textContent).toContain('Ferrari');
      expect(container.textContent).toContain('McLaren');
    });

    it('each card shows the nationality', async () => {
      await view.render(container, {});
      expect(container.textContent).toContain('Austrian');
      expect(container.textContent).toContain('Italian');
      expect(container.textContent).toContain('British');
    });

    it('constructor card image is rendered for constructors with logoUrl', async () => {
      await view.render(container, {});
      const logoImgs = container.querySelectorAll('.constructor-logo-img');
      // Two constructors have logoUrl set
      expect(logoImgs.length).toBe(2);
    });

    it('renders initials fallback for constructors without logo', async () => {
      mockDataStore.data.constructors = [MOCK_CONSTRUCTORS[2]]; // McLaren, no logoUrl
      await view.render(container, {});
      const logo = container.querySelector('.constructor-logo');
      expect(logo).not.toBeNull();
      expect(logo.textContent).toBe('M');
    });

    it('cards have cursor:pointer', async () => {
      await view.render(container, {});
      const card = container.querySelector('.constructor-card');
      expect(card.style.cursor).toBe('pointer');
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────

  describe('sorting by standings position', () => {
    it('places ranked constructors before unranked ones', async () => {
      await view.render(container, {});
      const names = Array.from(container.querySelectorAll('.constructor-name')).map(n => n.textContent);
      // Ferrari P1 and Red Bull P2 should appear before unranked McLaren
      expect(names.indexOf('Ferrari')).toBeLessThan(names.indexOf('McLaren'));
      expect(names.indexOf('Red Bull Racing')).toBeLessThan(names.indexOf('McLaren'));
    });

    it('orders ranked constructors by position ascending', async () => {
      await view.render(container, {});
      const names = Array.from(container.querySelectorAll('.constructor-name')).map(n => n.textContent);
      expect(names[0]).toBe('Ferrari');
      expect(names[1]).toBe('Red Bull Racing');
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when not loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, {});
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });

    it('skips load when already loaded', async () => {
      await view.render(container, {});
      expect(mockDataStore.load).not.toHaveBeenCalled();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('constructor card (with logo) matches snapshot', async () => {
      mockDataStore.data.constructors = [MOCK_CONSTRUCTORS[0]];
      mockDataStore.data.constructorSeasonSummary = [];
      await view.render(container, {});
      expect(container.querySelector('.constructor-card').outerHTML).toMatchSnapshot();
    });

    it('empty state matches snapshot', async () => {
      mockDataStore.data.constructors = [];
      await view.render(container, {});
      expect(container.querySelector('.empty-state').outerHTML).toMatchSnapshot();
    });
  });
});
