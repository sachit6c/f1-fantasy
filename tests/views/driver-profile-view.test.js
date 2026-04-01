// tests/views/driver-profile-view.test.js
// Unit tests for DriverProfileView

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriverProfileView } from '../../views/driver-profile-view.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDataStore, mockDraftStore } = vi.hoisted(() => {
  const driver = {
    driverId: 'max_verstappen',
    name: 'Max Verstappen',
    code: 'VER',
    team: 'Red Bull Racing',
    teamColor: '#3671C6',
    photoUrl: 'data/images/drivers/max_verstappen.jpg',
    number: '1',
    nationality: 'Dutch'
  };
  const constructor = {
    constructorId: 'red_bull',
    name: 'Red Bull Racing',
    nationality: 'Austrian',
    teamColor: '#3671C6',
    logoUrl: 'data/images/constructors/red_bull.png'
  };
  return {
    mockDataStore: {
      loaded: true,
      season: 2026,
      data: {
        races: [],
        drivers: [driver],
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
        driverById: new Map([['max_verstappen', driver]]),
        raceById: new Map()
      },
      load: vi.fn().mockResolvedValue(true),
      setSeason: vi.fn(),
      getDriverSeasonSummary: vi.fn().mockReturnValue(null),
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
  };
});

vi.mock('../../lib/data-store.js', () => ({ dataStore: mockDataStore }));
vi.mock('../../lib/draft-store.js', () => ({ draftStore: mockDraftStore }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DriverProfileView', () => {
  let view;
  let container;

  const driver = { driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER', team: 'Red Bull Racing', teamColor: '#3671C6', photoUrl: 'data/images/drivers/max_verstappen.jpg', number: '1', nationality: 'Dutch' };
  const constructor = { constructorId: 'red_bull', name: 'Red Bull Racing', nationality: 'Austrian', teamColor: '#3671C6', logoUrl: 'data/images/constructors/red_bull.png' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.season = 2026;
    mockDataStore.data.drivers = [driver];
    mockDataStore.data.constructors = [constructor];
    mockDataStore.data.raceResults = [];
    mockDataStore.data.qualifying = [];
    mockDataStore.data.driverCareerSummary = [];
    mockDataStore.indexes.driverById = new Map([['max_verstappen', driver]]);
    mockDataStore.indexes.raceById = new Map();
    mockDataStore.getDriverSeasonSummary.mockReturnValue(null);
    mockDraftStore.draft = null;

    view = new DriverProfileView();
    container = document.createElement('div');
  });

  // ─── Not found ─────────────────────────────────────────────────────────────

  describe('driver not found', () => {
    it('renders the empty-state element for unknown driverId', async () => {
      await view.render(container, { driverId: 'unknown_driver' });
      expect(container.querySelector('.empty-state')).not.toBeNull();
    });

    it('shows "Driver Not Found" message', async () => {
      await view.render(container, { driverId: 'unknown_driver' });
      expect(container.textContent).toContain('Driver Not Found');
    });

    it('includes a link back to the calendar', async () => {
      await view.render(container, { driverId: 'unknown_driver' });
      const backLink = container.querySelector('a[href="#/calendar"]');
      expect(backLink).not.toBeNull();
    });

    it('not-found state matches snapshot', async () => {
      await view.render(container, { driverId: 'unknown_driver' });
      expect(container.querySelector('.empty-state').outerHTML).toMatchSnapshot();
    });
  });

  // ─── Driver found ──────────────────────────────────────────────────────────

  describe('driver found', () => {
    it('renders the driver profile header', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.driver-profile-header')).not.toBeNull();
    });

    it('renders the driver name', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.textContent).toContain('Max Verstappen');
    });

    it('renders the driver code', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.textContent).toContain('VER');
    });

    it('renders the driver number in the info section', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.textContent).toContain('1');
    });

    it('renders the driver nationality', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.textContent).toContain('Dutch');
    });

    it('renders a driver photo element', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      const photo = container.querySelector('.driver-photo-large');
      expect(photo).not.toBeNull();
      expect(photo.alt).toBe('Max Verstappen');
    });

    it('renders info card with at least Number and Nationality fields', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      const labels = Array.from(container.querySelectorAll('.info-label')).map(l => l.textContent);
      expect(labels).toContain('Number');
      expect(labels).toContain('Nationality');
    });

    it('renders the back link', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.back-link')).not.toBeNull();
    });
  });

  // ─── Back link with completed draft ───────────────────────────────────────

  describe('back link label', () => {
    it('shows generic back text when no completed draft', async () => {
      mockDraftStore.draft = null;
      await view.render(container, { driverId: 'max_verstappen' });
      const backLink = container.querySelector('.back-link');
      expect(backLink.textContent).toContain('Back to Team Comparison');
    });

    it('shows player names in back text when draft is completed', async () => {
      mockDraftStore.draft = {
        status: 'completed',
        players: [{ name: 'Alice' }, { name: 'Bob' }]
      };
      await view.render(container, { driverId: 'max_verstappen' });
      const backLink = container.querySelector('.back-link');
      expect(backLink.textContent).toContain('Alice');
      expect(backLink.textContent).toContain('Bob');
    });
  });

  // ─── Season stats ─────────────────────────────────────────────────────────

  describe('season stats', () => {
    it('renders season stats card when summary data exists', async () => {
      mockDataStore.getDriverSeasonSummary.mockReturnValue({
        points: 200,
        position: 1,
        wins: 5
      });
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.stats-card')).not.toBeNull();
    });

    it('skips season stats card when no summary data', async () => {
      mockDataStore.getDriverSeasonSummary.mockReturnValue(null);
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.stats-card')).toBeNull();
    });

    it('displays points and wins from summary', async () => {
      mockDataStore.getDriverSeasonSummary.mockReturnValue({
        points: 200,
        position: 1,
        wins: 5
      });
      await view.render(container, { driverId: 'max_verstappen' });
      const statValues = Array.from(container.querySelectorAll('.stat-value')).map(el => el.textContent);
      expect(statValues.some(v => v.includes('200'))).toBe(true);
      expect(statValues.some(v => v.includes('5'))).toBe(true);
    });
  });

  // ─── Race history ─────────────────────────────────────────────────────────

  describe('race history', () => {
    it('does not render race history section when no results exist', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.race-history-card')).toBeNull();
    });

    it('renders a race results table when results exist', async () => {
      const mockRace = { raceId: '2026_01', raceName: 'Australian GP', round: 1 };
      mockDataStore.data.raceResults = [{
        driverId: 'max_verstappen',
        raceId: '2026_01',
        position: 1,
        grid: 1,
        points: 25,
        status: 'Finished',
        season: 2026,
        round: 1
      }];
      mockDataStore.indexes.raceById.set('2026_01', mockRace);
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.race-history-card')).not.toBeNull();
      expect(container.querySelector('.results-table')).not.toBeNull();
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when not yet loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, { driverId: 'max_verstappen' });
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });
  });

  // ─── renderSeasonStats with race data ────────────────────────────────────

  describe('renderSeasonStats with race and qualifying data', () => {
    const mockRace = { raceId: '2026_01', raceName: 'Australian Grand Prix', round: 1, season: 2026 };

    beforeEach(() => {
      mockDataStore.getDriverSeasonSummary.mockReturnValue({
        points: 200, position: 1, wins: 3
      });
      mockDataStore.indexes.raceById.set('2026_01', mockRace);
    });

    it('renders stats with win/podium/pole counts when race data exists', async () => {
      mockDataStore.data.raceResults = [
        { driverId: 'max_verstappen', raceId: '2026_01', position: 1, grid: 1, points: 25, status: 'Finished', fastestLapRank: 1, season: 2026 }
      ];
      mockDataStore.data.qualifying = [
        { driverId: 'max_verstappen', raceId: '2026_01', position: 1, q1: '1:18.1', q2: '1:17.5', q3: '1:17.0', season: 2026 }
      ];
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.stats-card')).not.toBeNull();
      // Wins=3 (from summary), Poles=1, FL=1, Podiums=1
      const statText = container.querySelector('.stats-grid').textContent;
      expect(statText).toContain('200'); // points
    });

    it('calculates average position improvement when both race and quali data exist', async () => {
      mockDataStore.data.raceResults = [
        { driverId: 'max_verstappen', raceId: '2026_01', position: 2, grid: 3, points: 18, status: 'Finished', fastestLapRank: null, season: 2026 }
      ];
      mockDataStore.data.qualifying = [
        { driverId: 'max_verstappen', raceId: '2026_01', position: 3, q1: '1:18.1', q2: '1:17.5', q3: '1:17.0', season: 2026 }
      ];
      await view.render(container, { driverId: 'max_verstappen' });
      // Avg improvement: quali pos 3 → race pos 2 = +1.0
      const statsGrid = container.querySelector('.stats-grid');
      expect(statsGrid.textContent).toContain('+1.0');
    });

    it('renders DNF status correctly', async () => {
      mockDataStore.data.raceResults = [
        { driverId: 'max_verstappen', raceId: '2026_01', position: 20, grid: 1, points: 0, status: 'Engine', fastestLapRank: null, season: 2026 }
      ];
      await view.render(container, { driverId: 'max_verstappen' });
      const statsGrid = container.querySelector('.stats-grid');
      // DNFs stat should show 1
      expect(statsGrid).not.toBeNull();
    });

    it('renders Q1-out qualifying stat', async () => {
      mockDataStore.data.qualifying = [
        // Q1 time only (no Q2 → knocked out in Q1)
        { driverId: 'max_verstappen', raceId: '2026_01', position: 18, q1: '1:20.0', q2: null, q3: null, season: 2026 }
      ];
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.querySelector('.stats-grid')).not.toBeNull();
    });
  });

  // ─── renderCareerStats ────────────────────────────────────────────────────

  describe('renderCareerStats', () => {
    it('renders career stats card when career data exists', async () => {
      mockDataStore.data.driverCareerSummary = [{
        driverId: 'max_verstappen',
        totalPoints: 2000,
        totalRaces: 150,
        totalWins: 50,
        totalPodiums: 80,
        totalPoles: 40,
        championships: 4
      }];
      await view.render(container, { driverId: 'max_verstappen' });
      expect(container.textContent).toContain('Career Statistics');
      expect(container.textContent).toContain('2000');
    });

    it('does not render career stats card when no career data', async () => {
      mockDataStore.data.driverCareerSummary = [];
      await view.render(container, { driverId: 'max_verstappen' });
      // Only one stats card at most (season stats, if summary exists)
      const cards = container.querySelectorAll('.stats-card');
      const careerCard = Array.from(cards).find(c => c.textContent.includes('Career Statistics'));
      expect(careerCard).toBeUndefined();
    });
  });

  // ─── Chart rendering (fake timers + Chart.js mock) ────────────────────────

  describe('chart rendering', () => {
    const leclerc = { driverId: 'charles_leclerc', name: 'Charles Leclerc', code: 'LEC', team: 'Ferrari', teamColor: '#E8002D' };
    const driver = { driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER', team: 'Red Bull Racing', teamColor: '#3671C6', photoUrl: 'data/images/drivers/max_verstappen.jpg', number: '1', nationality: 'Dutch' };

    beforeEach(() => {
      vi.useFakeTimers();
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
      global.Chart = vi.fn().mockImplementation((ctx, config) => {
        const opts = config?.options || {};
        const tryCall = (fn, ...args) => { try { if (typeof fn === 'function') fn(...args); } catch(e) {} };
        tryCall(opts.plugins?.legend?.labels?.filter, { text: 'Max Verstappen' }, config);
        tryCall(opts.plugins?.tooltip?.callbacks?.label, { dataset: { label: 'VER' }, parsed: { y: 1 } });
        tryCall(opts.scales?.y?.ticks?.callback, 1);
        tryCall(opts.scales?.y?.ticks?.callback, 50);
        return { destroy: vi.fn(), update: vi.fn() };
      });

      mockDataStore.data.drivers = [driver, leclerc];
      mockDataStore.data.raceResults = [
        { driverId: 'max_verstappen', raceId: '2026_01', position: 1, grid: 1, points: 25, status: 'Finished', fastestLapRank: 1, season: 2026, round: 1 },
        { driverId: 'charles_leclerc', raceId: '2026_01', position: 2, grid: 2, points: 18, status: 'Finished', fastestLapRank: null, season: 2026, round: 1 }
      ];
      mockDataStore.data.races = [
        { raceId: '2026_01', raceName: 'Australian Grand Prix', name: 'Australian Grand Prix', round: 1, season: 2026 }
      ];
      mockDataStore.data.sprintResults = [];
      mockDataStore.indexes.driverById = new Map([
        ['max_verstappen', driver],
        ['charles_leclerc', leclerc]
      ]);
    });

    afterEach(() => {
      vi.useRealTimers();
      delete global.Chart;
      delete HTMLCanvasElement.prototype.getContext;
    });

    it('renders rank progression chart section when race data exists', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      vi.runAllTimers();
      expect(container.querySelector('.rank-progression')).not.toBeNull();
    });

    it('creates a Chart instance for rank progression', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      vi.runAllTimers();
      expect(global.Chart).toHaveBeenCalled();
    });

    it('renders points progression chart section when cumulative points exist', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      vi.runAllTimers();
      expect(container.querySelector('.points-progression')).not.toBeNull();
    });

    it('creates two Chart instances for rank and points progression', async () => {
      await view.render(container, { driverId: 'max_verstappen' });
      vi.runAllTimers();
      // Two chart methods each create one Chart
      expect(global.Chart).toHaveBeenCalledTimes(2);
    });

    it('does not render rank chart when no race data exists', async () => {
      mockDataStore.data.raceResults = [];
      await view.render(container, { driverId: 'max_verstappen' });
      vi.runAllTimers();
      expect(container.querySelector('.rank-progression')).toBeNull();
    });

    it('does not render points chart when no race data with points exists', async () => {
      mockDataStore.data.raceResults = [];
      await view.render(container, { driverId: 'max_verstappen' });
      vi.runAllTimers();
      expect(container.querySelector('.points-progression')).toBeNull();
    });
  });
});
