// tests/views/race-detail-view.test.js
// Unit tests for RaceDetailView

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RaceDetailView } from '../../views/race-detail-view.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDataStore, mockDraftStore } = vi.hoisted(() => {
  const race = {
    raceId: '2026_01',
    raceName: 'Australian Grand Prix',
    round: 1,
    circuitId: 'albert_park',
    circuitName: 'Albert Park',
    locality: 'Melbourne',
    country: 'Australia',
    date: '2026-03-15',
    season: 2026
  };
  return {
    mockDataStore: {
      loaded: true,
      season: 2026,
      data: {
        races: [race],
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
        raceById: new Map([['2026_01', race]]),
        driverById: new Map(),
        resultsByRace: new Map(),
        qualifyingByRace: new Map()
      },
      load: vi.fn().mockResolvedValue(true),
      setSeason: vi.fn()
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

describe('RaceDetailView', () => {
  let view;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDataStore.loaded = true;
    mockDataStore.indexes.raceById = new Map([['2026_01', { raceId: '2026_01', raceName: 'Australian Grand Prix', round: 1, circuitId: 'albert_park', circuitName: 'Albert Park', locality: 'Melbourne', country: 'Australia', date: '2026-03-15', season: 2026 }]]);
    mockDataStore.indexes.resultsByRace = new Map();
    mockDataStore.indexes.qualifyingByRace = new Map();
    mockDataStore.data.raceResults = [];
    mockDataStore.data.qualifying = [];
    mockDataStore.data.drivers = [];
    mockDraftStore.currentSeason = 2026;

    view = new RaceDetailView();
    container = document.createElement('div');
  });

  // ─── Not found ─────────────────────────────────────────────────────────────

  describe('race not found', () => {
    it('renders the empty-state element for unknown raceId', async () => {
      await view.render(container, { raceId: 'unknown_race' });
      expect(container.querySelector('.empty-state')).not.toBeNull();
    });

    it('shows "Race Not Found" message', async () => {
      await view.render(container, { raceId: 'unknown_race' });
      expect(container.textContent).toContain('Race Not Found');
    });

    it('provides a back link to the calendar', async () => {
      await view.render(container, { raceId: 'unknown_race' });
      expect(container.querySelector('a[href="#/calendar"]')).not.toBeNull();
    });

    it('not-found state matches snapshot', async () => {
      await view.render(container, { raceId: 'unknown_race' });
      expect(container.querySelector('.empty-state').outerHTML).toMatchSnapshot();
    });
  });

  // ─── Race found ────────────────────────────────────────────────────────────

  describe('race found', () => {
    it('renders the page title with the race name', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.querySelector('.page-title').textContent).toBe('Australian Grand Prix');
    });

    it('renders the back link to calendar', async () => {
      await view.render(container, { raceId: '2026_01' });
      const backLink = container.querySelector('.back-link');
      expect(backLink).not.toBeNull();
      expect(backLink.href).toContain('#/calendar');
    });

    it('shows the round badge', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.querySelector('.round-badge')).not.toBeNull();
      expect(container.querySelector('.round-badge').textContent).toContain('1');
    });

    it('shows circuit name and location', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.textContent).toContain('Albert Park');
      expect(container.textContent).toContain('Melbourne');
      expect(container.textContent).toContain('Australia');
    });

    it('renders the race info card', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.querySelector('.race-info-card')).not.toBeNull();
    });

    it('race info card contains Date, Circuit, and Location fields', async () => {
      await view.render(container, { raceId: '2026_01' });
      const labels = Array.from(container.querySelectorAll('.info-label')).map(l => l.textContent);
      expect(labels).toContain('Date');
      expect(labels).toContain('Circuit');
      expect(labels).toContain('Location');
    });

    it('formats the race date in a human-readable format', async () => {
      await view.render(container, { raceId: '2026_01' });
      const infoCard = container.querySelector('.race-info-card');
      // Should contain the year 2026 and some indication of the date
      expect(infoCard.textContent).toContain('2026');
    });
  });

  // ─── Results section ──────────────────────────────────────────────────────

  describe('results rendering', () => {
    it('renders a qualifying section when qualifying data exists', async () => {
      mockDataStore.indexes.qualifyingByRace.set('2026_01', [
        { driverId: 'max_verstappen', position: '1', q1: '1:18.456', q2: '1:17.890', q3: '1:17.123', raceId: '2026_01' }
      ]);
      await view.render(container, { raceId: '2026_01' });
      expect(container.textContent).toContain('Qualifying');
    });

    it('renders a race results section when race results exist', async () => {
      mockDataStore.indexes.resultsByRace.set('2026_01', [
        { driverId: 'max_verstappen', position: '1', points: '25', status: 'Finished', raceId: '2026_01' }
      ]);
      await view.render(container, { raceId: '2026_01' });
      expect(container.textContent.toLowerCase()).toContain('result');
    });
  });

  // ─── Data loading ─────────────────────────────────────────────────────────

  describe('data loading', () => {
    it('calls dataStore.load() when not yet loaded', async () => {
      mockDataStore.loaded = false;
      await view.render(container, { raceId: '2026_01' });
      expect(mockDataStore.load).toHaveBeenCalledOnce();
    });

    it('skips load when already loaded', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(mockDataStore.load).not.toHaveBeenCalled();
    });
  });

  // ─── Snapshot ────────────────────────────────────────────────────────────

  describe('snapshot', () => {
    it('race detail header matches snapshot', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.querySelector('.race-detail-header').outerHTML).toMatchSnapshot();
    });
  });

  // ─── Race results with completed draft ────────────────────────────────────

  describe('results with completed draft (ownership columns)', () => {
    const verDriver = {
      driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER',
      team: 'Red Bull Racing', teamColor: '#3671C6'
    };
    const lecDriver = {
      driverId: 'charles_leclerc', name: 'Charles Leclerc', code: 'LEC',
      team: 'Ferrari', teamColor: '#E8002D'
    };

    beforeEach(() => {
      mockDraftStore.draft = {
        status: 'completed',
        players: [
          { playerId: 'player_1', name: 'Alice', roster: ['max_verstappen'] },
          { playerId: 'player_2', name: 'Bob', roster: ['charles_leclerc'] }
        ]
      };
      mockDataStore.indexes.driverById = new Map([
        ['max_verstappen', verDriver],
        ['charles_leclerc', lecDriver]
      ]);
      mockDataStore.indexes.qualifyingByRace.set('2026_01', [
        { driverId: 'max_verstappen', position: '1', q1: '1:18.4', q2: '1:17.8', q3: '1:17.1', raceId: '2026_01' },
        { driverId: 'charles_leclerc', position: '3', q1: '1:18.6', q2: '1:17.9', q3: '1:17.3', raceId: '2026_01' }
      ]);
      mockDataStore.indexes.resultsByRace.set('2026_01', [
        { driverId: 'max_verstappen', position: '1', grid: '1', points: '25', status: 'Finished', raceId: '2026_01' },
        { driverId: 'charles_leclerc', position: '3', grid: '3', points: '15', status: 'Finished', raceId: '2026_01' }
      ]);
    });

    it('renders an Owner column in the qualifying table when draft is completed', async () => {
      await view.render(container, { raceId: '2026_01' });
      const tables = container.querySelectorAll('table');
      const hasOwnerCol = Array.from(tables).some(t => t.textContent.includes('Owner'));
      expect(hasOwnerCol).toBe(true);
    });

    it('marks qualifying rows with player1-owned class for Alice drivers', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.querySelector('.player1-owned')).not.toBeNull();
    });

    it('marks qualifying rows with player2-owned class for Bob drivers', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.querySelector('.player2-owned')).not.toBeNull();
    });

    it('shows player name in the owner column', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.textContent).toContain('Alice');
      expect(container.textContent).toContain('Bob');
    });

    it('renders driver name from driverById index when driver is found', async () => {
      await view.render(container, { raceId: '2026_01' });
      expect(container.textContent).toContain('Max Verstappen');
      expect(container.textContent).toContain('Charles Leclerc');
    });

    it('falls back to driverId when driver is not in index', async () => {
      // Remove one driver from the index
      mockDataStore.indexes.driverById = new Map([['max_verstappen', verDriver]]);
      await view.render(container, { raceId: '2026_01' });
      expect(container.textContent).toContain('charles_leclerc');
    });
  });
});
