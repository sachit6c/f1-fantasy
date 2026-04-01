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
});
