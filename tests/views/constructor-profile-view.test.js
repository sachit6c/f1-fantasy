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

  // ─── renderSeasonStats ────────────────────────────────────────────────────

  describe('renderSeasonStats', () => {
    const seasonSummary = {
      constructorId: 'ferrari',
      season: 2026,
      position: 2,
      points: 260,
      wins: 3,
      podiums: 0
    };

    it('renders a stats-card when constructor season summary exists', async () => {
      mockDataStore.data.constructorSeasonSummary = [seasonSummary];
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.stats-card')).not.toBeNull();
    });

    it('shows season statistics title with the season year', async () => {
      mockDataStore.data.constructorSeasonSummary = [seasonSummary];
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.textContent).toContain('2026 Season Statistics');
    });

    it('includes wins and points in the stats grid', async () => {
      mockDataStore.data.constructorSeasonSummary = [seasonSummary];
      await view.render(container, { constructorId: 'ferrari' });
      const statsText = container.querySelector('.stats-grid').textContent;
      expect(statsText).toContain('260'); // points
      expect(statsText).toContain('3');   // wins
    });

    it('does not render stats-card when no constructor summary exists', async () => {
      mockDataStore.data.constructorSeasonSummary = [];
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.stats-card')).toBeNull();
    });
  });

  // ─── renderRaceResults ────────────────────────────────────────────────────

  describe('renderRaceResults', () => {
    const ferRace = {
      raceId: '2026_01',
      round: 1,
      raceName: 'Australian Grand Prix',
      season: 2026
    };
    const lecResult = {
      raceId: '2026_01',
      driverId: 'charles_leclerc',
      position: 2,
      points: 18,
      season: 2026,
      status: 'Finished'
    };

    it('renders a race-history-card when team race results exist', async () => {
      mockDataStore.data.raceResults = [lecResult];
      mockDataStore.indexes.raceById = new Map([['2026_01', ferRace]]);
      mockDataStore.indexes.driverById = new Map([
        ['charles_leclerc', drivers[0]],
        ['carlos_sainz', drivers[1]]
      ]);
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.race-history-card')).not.toBeNull();
    });

    it('shows "Race Results" heading', async () => {
      mockDataStore.data.raceResults = [lecResult];
      mockDataStore.indexes.raceById = new Map([['2026_01', ferRace]]);
      mockDataStore.indexes.driverById = new Map([['charles_leclerc', drivers[0]]]);
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.textContent).toContain('Race Results');
    });

    it('shows race name as a link in the results table', async () => {
      mockDataStore.data.raceResults = [lecResult];
      mockDataStore.indexes.raceById = new Map([['2026_01', ferRace]]);
      mockDataStore.indexes.driverById = new Map([['charles_leclerc', drivers[0]]]);
      await view.render(container, { constructorId: 'ferrari' });
      const raceLink = container.querySelector('a[href="#/race/2026_01"]');
      expect(raceLink).not.toBeNull();
      expect(raceLink.textContent).toContain('Australian Grand Prix');
    });

    it('does not render race-history-card when there are no race results', async () => {
      mockDataStore.data.raceResults = [];
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.race-history-card')).toBeNull();
    });
  });

  // ─── createDriverDetailCard with season data ──────────────────────────────

  describe('createDriverDetailCard — with season summary', () => {
    it('renders driver stats grid when season summary exists', async () => {
      mockDataStore.getDriverSeasonSummary.mockReturnValue({
        season: 2026,
        driverId: 'charles_leclerc',
        position: 2,
        points: 170,
        wins: 3
      });
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.driver-stats-grid')).not.toBeNull();
    });

    it('renders "No season data available" when no season summary', async () => {
      mockDataStore.getDriverSeasonSummary.mockReturnValue(null);
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.textContent).toContain('No season data available');
    });

    it('renders driver name as a link to /driver/:id', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('a[href="#/driver/charles_leclerc"]')).not.toBeNull();
    });

    it('shows owner badge when driver is in a player roster', async () => {
      mockDraftStore.draft = {
        status: 'in_progress',
        players: [
          { playerId: 'player_1', name: 'Alice', roster: ['charles_leclerc'] },
          { playerId: 'player_2', name: 'Bob', roster: [] }
        ]
      };
      await view.render(container, { constructorId: 'ferrari' });
      expect(container.querySelector('.driver-owner-badge')).not.toBeNull();
      expect(container.textContent).toContain('Drafted by: Alice');
    });
  });

  // ─── Chart rendering (fake timers + Chart.js mock) ────────────────────────

  describe('chart rendering', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
      global.Chart = vi.fn().mockImplementation((ctx, config) => {
        const opts = config?.options || {};
        const tryCall = (fn, ...args) => { try { if (typeof fn === 'function') fn(...args); } catch(e) {} };
        tryCall(opts.plugins?.legend?.labels?.filter, { text: 'Ferrari' }, config);
        tryCall(opts.plugins?.tooltip?.callbacks?.label, { dataset: { label: 'LEC' }, parsed: { y: 1 } });
        tryCall(opts.scales?.y?.ticks?.callback, 1);
        tryCall(opts.scales?.y?.ticks?.callback, 50);
        return { destroy: vi.fn(), update: vi.fn() };
      });

      mockDataStore.data.raceResults = [
        { driverId: 'charles_leclerc', raceId: '2026_01', position: 1, grid: 1, points: 25, status: 'Finished', fastestLapRank: 1, season: 2026, round: 1 },
        { driverId: 'carlos_sainz', raceId: '2026_01', position: 3, grid: 3, points: 15, status: 'Finished', fastestLapRank: null, season: 2026, round: 1 }
      ];
      mockDataStore.data.races = [
        { raceId: '2026_01', raceName: 'Australian Grand Prix', name: 'Australian Grand Prix', round: 1, season: 2026 }
      ];
      mockDataStore.data.sprintResults = [];
    });

    afterEach(() => {
      vi.useRealTimers();
      delete global.Chart;
      delete HTMLCanvasElement.prototype.getContext;
    });

    it('renders rank progression chart section when race data exists', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      vi.runAllTimers();
      expect(container.querySelector('.rank-progression')).not.toBeNull();
    });

    it('creates a Chart instance for the rank progression chart', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      vi.runAllTimers();
      expect(global.Chart).toHaveBeenCalled();
    });

    it('renders points progression chart section when cumulative points exist', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      vi.runAllTimers();
      expect(container.querySelector('.points-progression')).not.toBeNull();
    });

    it('creates two Chart instances (rank + points progression)', async () => {
      await view.render(container, { constructorId: 'ferrari' });
      vi.runAllTimers();
      expect(global.Chart).toHaveBeenCalledTimes(2);
    });

    it('does not render charts when no race data exists', async () => {
      mockDataStore.data.raceResults = [];
      await view.render(container, { constructorId: 'ferrari' });
      vi.runAllTimers();
      expect(container.querySelector('.rank-progression')).toBeNull();
      expect(container.querySelector('.points-progression')).toBeNull();
    });
  });
});
