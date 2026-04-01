// tests/views/constructor-profile-view.test.js
// Unit tests for ConstructorProfileView

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConstructorProfileView } from '../../views/constructor-profile-view.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDataStore, mockDraftStore } = vi.hoisted(() => {
  const constructor = {
    constructorId: 'ferrari',
    name: 'Ferrari',
    nationality: 'Italian',
    teamColor: '#E8002D',
    logoUrl: 'data/images/constructors/ferrari.png'
  };
  const drivers = [
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
      driverId: 'carlos_sainz',
      name: 'Carlos Sainz',
      code: 'SAI',
      team: 'Ferrari',
      teamColor: '#E8002D',
      photoUrl: 'data/images/drivers/carlos_sainz.jpg',
      number: '55',
      nationality: 'Spanish'
    }
  ];
  return {
    mockDataStore: {
      loaded: true,
      season: 2026,
      data: {
        races: [],
        drivers,
        constructors: [constructor],
        driverTeams: [],
        qualifying: [],
        raceResults: [],
        sprintResults: [],
        driverSeasonSummary: [],
        driverCareerSummary: [],
        constructorSeasonSummary: []
      },
      indexes: {
        constructorById: new Map([['ferrari', constructor]]),
        driverById: new Map(),
        raceById: new Map(),
        resultsByRace: new Map()
      },
      load: vi.fn().mockResolvedValue(true),
      setSeason: vi.fn(),
      getConstructorLogoWithFallback: vi.fn().mockReturnValue({
        primary: 'data/images/constructors/ferrari.png',
        fallback1: 'data/images/constructors/ferrari.jpg',
        fallback2: 'data/images/constructors/ferrari.svg'
      }),
      getConstructorSeasonSummary: vi.fn().mockReturnValue(null),
      getDriverSeasonSummary: vi.fn().mockReturnValue(null)
    },
    mockDraftStore: {
      currentSeason: 2026,
      draft: null,
      loadCurrentSeason: vi.fn()
    }
  };
});

vi.mock('../../lib/data-store.js', () => ({ dataStore: mockDataStore }));
vi.mock('../../lib/draft-store.js', () => ({ draftStore: mockDraftStore }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConstructorProfileView', () => {
  let view;
  let container;

  const constructor = { constructorId: 'ferrari', name: 'Ferrari', nationality: 'Italian', teamColor: '#E8002D', logoUrl: 'data/images/constructors/ferrari.png' };
  const drivers = [
    { driverId: 'charles_leclerc', name: 'Charles Leclerc', code: 'LEC', team: 'Ferrari', teamColor: '#E8002D', photoUrl: 'data/images/drivers/charles_leclerc.jpg', number: '16', nationality: 'Monegasque' },
    { driverId: 'carlos_sainz', name: 'Carlos Sainz', code: 'SAI', team: 'Ferrari', teamColor: '#E8002D', photoUrl: 'data/images/drivers/carlos_sainz.jpg', number: '55', nationality: 'Spanish' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.season = 2026;
    mockDataStore.data.constructors = [constructor];
    mockDataStore.data.drivers = [...drivers];
    mockDataStore.data.raceResults = [];
    mockDataStore.data.qualifying = [];
    mockDataStore.data.constructorSeasonSummary = [];
    mockDataStore.indexes.constructorById = new Map([['ferrari', constructor]]);
    mockDataStore.indexes.raceById = new Map();
    mockDataStore.indexes.resultsByRace = new Map();
    mockDraftStore.draft = null;

    view = new ConstructorProfileView();
    container = document.createElement('div');
  });

  // ─── Not found ─────────────────────────────────────────────────────────────

  describe('constructor not found', () => {
    it('renders the empty-state element for unknown constructorId', async () => {
      await view.render(container, { constructorId: 'unknown_team' });
      expect(container.querySelector('.empty-state')).not.toBeNull();
    });

    it('shows "Constructor Not Found" message', async () => {
      await view.render(container, { constructorId: 'unknown_team' });
      expect(container.textContent).toContain('Constructor Not Found');
    });

    it('provides a back link to the calendar', async () => {
      await view.render(container, { constructorId: 'unknown_team' });
      expect(container.querySelector('a[href="#/calendar"]')).not.toBeNull();
    });

    it('not-found state matches snapshot', async () => {
      await view.render(container, { constructorId: 'unknown_team' });
      expect(container.querySelector('.empty-state').outerHTML).toMatchSnapshot();
    });
  });

  // ─── Constructor found ──────────────────────────────────────────────────────

  describe('constructor found', () => {
    it('renders the constructor profile header', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.constructor-profile-header')).not.toBeNull();
    });

    it('renders the constructor name', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.textContent).toContain('Ferrari');
    });

    it('renders the back link', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.back-link')).not.toBeNull();
    });

    it('renders a drivers section', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      // Drivers for this team should be listed in the profile
      expect(container.textContent).toContain('Charles Leclerc');
      expect(container.textContent).toContain('Carlos Sainz');
    });
  });

  // ─── Back link label ──────────────────────────────────────────────────────

  describe('back link label', () => {
    it('shows generic back text when no completed draft', async () => {
      mockDraftStore.draft = null;
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.back-link').textContent).toContain('Back to Team Comparison');
    });

    it('includes player names in back text for completed drafts', async () => {
      mockDraftStore.draft = {
        status: 'completed',
        players: [{ name: 'Alice', roster: [] }, { name: 'Bob', roster: [] }]
      };
      await view.render(container, { constructorId: 'ferrari' });
      const backLink = container.querySelector('.back-link');
      expect(backLink.textContent).toContain('Alice');
      expect(backLink.textContent).toContain('Bob');
    });
  });

  // ─── Info section ─────────────────────────────────────────────────────────

  describe('info section', () => {
    it('renders nationality in the info section', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.textContent).toContain('Italian');
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when not yet loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, { constructorId: 'ferrari' });
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });
  });

  // ─── Snapshot ───────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('constructor profile header matches snapshot', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.constructor-profile-header').outerHTML).toMatchSnapshot();
    });
  });
});
