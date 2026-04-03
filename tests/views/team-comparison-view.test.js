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
    getSprintResults: vi.fn().mockReturnValue([]),
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
      // When draft is completed the label shows player names ("Alice vs Bob"), not "Comparison"
      const comparisonBtn = Array.from(container.querySelectorAll('.tab-btn'))
        .find(b => b.textContent.includes('Alice') || b.textContent.includes('Comparison'));
      expect(comparisonBtn).not.toBeUndefined();
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

  // ─── Driver standings panel content ──────────────────────────────────────

  describe('driver standings panel content', () => {
    beforeEach(() => {
      mockDataStore.indexes.driverById = new Map([
        ['max_verstappen', { driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER', teamColor: '#3671C6', photoUrl: '', number: 1 }],
        ['charles_leclerc', { driverId: 'charles_leclerc', name: 'Charles Leclerc', code: 'LEC', teamColor: '#E8002D', photoUrl: '', number: 16 }]
      ]);
    });

    it('renders Driver Championship Standings heading', async () => {
      await view.render(container, {});
      const driverPanel = container.querySelector('#tab-driver-standings');
      expect(driverPanel.textContent).toContain('Driver Championship Standings');
    });

    it('renders a row for each driver in standings', async () => {
      await view.render(container, {});
      const driverPanel = container.querySelector('#tab-driver-standings');
      const rows = driverPanel.querySelectorAll('.standings-row');
      expect(rows.length).toBe(2);
    });

    it('shows driver names in the standings table', async () => {
      await view.render(container, {});
      const driverPanel = container.querySelector('#tab-driver-standings');
      expect(driverPanel.textContent).toContain('Max Verstappen');
      expect(driverPanel.textContent).toContain('Charles Leclerc');
    });

    it('shows standings points in the driver table', async () => {
      await view.render(container, {});
      const driverPanel = container.querySelector('#tab-driver-standings');
      expect(driverPanel.textContent).toContain('200');
    });

    it('renders "no data" message when driverSeasonSummary is empty', async () => {
      mockDataStore.data.driverSeasonSummary = [];
      await view.render(container, {});
      const driverPanel = container.querySelector('#tab-driver-standings');
      expect(driverPanel.querySelector('.no-data')).not.toBeNull();
    });
  });

  // ─── Constructor standings panel content ─────────────────────────────────

  describe('constructor standings panel content', () => {
    it('renders Constructor Championship Standings heading', async () => {
      await view.render(container, {});
      const conPanel = container.querySelector('#tab-constructor-standings');
      expect(conPanel.textContent).toContain('Constructor Championship Standings');
    });

    it('renders a row for each constructor in standings', async () => {
      await view.render(container, {});
      const conPanel = container.querySelector('#tab-constructor-standings');
      const rows = conPanel.querySelectorAll('.standings-row');
      expect(rows.length).toBe(2);
    });

    it('shows constructor names in the table', async () => {
      await view.render(container, {});
      const conPanel = container.querySelector('#tab-constructor-standings');
      expect(conPanel.textContent).toContain('Red Bull Racing');
      expect(conPanel.textContent).toContain('Ferrari');
    });

    it('renders error message when constructorSeasonSummary is empty', async () => {
      mockDataStore.data.constructorSeasonSummary = [];
      await view.render(container, {});
      const conPanel = container.querySelector('#tab-constructor-standings');
      expect(conPanel.querySelector('.error-message')).not.toBeNull();
    });
  });

  // ─── Comparison tab with completed draft ─────────────────────────────────

  describe('comparison tab with completed draft', () => {
    const makeComparison = () => ({
      leader: 'player_1',
      margin: 20,
      ties: 0,
      player1: {
        playerId: 'player_1', name: 'Alice',
        totalPoints: 550, raceWins: 2, fantasyWins: 2, podiums: 4, poles: 2,
        fastestLaps: 1, q3Apps: 6, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
        races: [
          { raceId: '2026_01', total: 55 },
          { raceId: '2026_02', total: 45 }
        ]
      },
      player2: {
        playerId: 'player_2', name: 'Bob',
        totalPoints: 530, raceWins: 1, fantasyWins: 1, podiums: 3, poles: 1,
        fastestLaps: 2, q3Apps: 5, q2Outs: 1, q1Outs: 0, dnfs: 1, dns: 0,
        races: [
          { raceId: '2026_01', total: 40 },
          { raceId: '2026_02', total: 60 }
        ]
      },
      raceComparisons: [
        { raceId: '2026_01', raceName: 'Australian GP', player1Total: 55, player2Total: 40, winner: 'player_1', margin: 15 },
        { raceId: '2026_02', raceName: 'Bahrain GP', player1Total: 45, player2Total: 60, winner: 'player_2', margin: 15 }
      ],
      driverMatchups: {
        matchups: [
          {
            team: 'Red Bull Racing', driver1Id: 'max_verstappen', driver2Id: 'sergio_perez',
            driver1Code: 'VER', driver2Code: 'PER',
            driver1Points: 200, driver2Points: 60,
            driver1Wins: 5, driver2Wins: 0,
            driver1Podiums: 5, driver2Podiums: 1,
            driver1Poles: 3, driver2Poles: 0,
            driver1FastestLaps: 2, driver2FastestLaps: 0,
            driver1QualiBeats: 3, driver2QualiBeats: 0,
            driver1RaceBeats: 3, driver2RaceBeats: 0,
            driver1DNFs: 0, driver2DNFs: 1,
            driver1Q3Apps: 3, driver2Q3Apps: 3,
            driver1Q2Outs: 0, driver2Q2Outs: 0,
            driver1Q1Outs: 0, driver2Q1Outs: 0,
            winner: 'player1', margin: 140
          }
        ]
      }
    });

    beforeEach(() => {
      mockDraftStore.draft = {
        status: 'completed',
        season: 2026,
        players: [
          { playerId: 'player_1', name: 'Alice', roster: [] },
          { playerId: 'player_2', name: 'Bob', roster: [] }
        ]
      };
      mockFantasyTeamScorer.compareTeams.mockReturnValue(makeComparison());
    });

    it('renders the Season Standings section', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Season Standings');
    });

    it('shows both player names in the standings cards', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Alice');
      expect(compPanel.textContent).toContain('Bob');
    });

    it('shows leader margin text', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Alice leads by 20 points');
    });

    it('renders the Head-to-Head Statistics section', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Head-to-Head Statistics');
    });

    it('renders the driver matchup card for Red Bull Racing', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.querySelector('.teammate-matchup-card')).not.toBeNull();
    });

    it('shows the "tied" margin text when margin is 0', async () => {
      const tied = makeComparison();
      tied.margin = 0;
      mockFantasyTeamScorer.compareTeams.mockReturnValue(tied);
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Teams are tied!');
    });

    it('renders race breakdown section', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Race');
    });

    it('handles all-zero stats gracefully (covers zero-division branches)', async () => {
      mockFantasyTeamScorer.compareTeams.mockReturnValue({
        leader: 'player_1',
        margin: 0,
        ties: 2,
        player1: {
          playerId: 'player_1', name: 'Alice',
          totalPoints: 0, raceWins: 0, fantasyWins: 0, podiums: 0, poles: 0,
          fastestLaps: 0, q3Apps: 0, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
          races: []
        },
        player2: {
          playerId: 'player_2', name: 'Bob',
          totalPoints: 0, raceWins: 0, fantasyWins: 0, podiums: 0, poles: 0,
          fastestLaps: 0, q3Apps: 0, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
          races: []
        },
        raceComparisons: [],
        driverMatchups: { matchups: [] }
      });
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      // Both players exist and have 0 stats
      expect(compPanel.textContent).toContain('Alice');
      expect(compPanel.textContent).toContain('Bob');
      expect(compPanel.textContent).toContain('Teams are tied!');
    });
  });

  // ─── Comparison tab with full data (covers renderDriverContributions etc.) ─

  describe('comparison tab full render', () => {
    const makeFullComparison = () => ({
      leader: 'player_1',
      margin: 10,
      ties: 0,
      player1: {
        playerId: 'player_1', name: 'Alice',
        totalPoints: 100, raceWins: 1, fantasyWins: 1, podiums: 2, poles: 1,
        fastestLaps: 1, q3Apps: 2, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
        races: [{ raceId: '2026_01', total: 25 }],
        drivers: [
          { driverId: 'max_verstappen', name: 'Max Verstappen', totalPoints: 100, wins: 1, podiums: 2, fastestLaps: 1, position: 1 }
        ]
      },
      player2: {
        playerId: 'player_2', name: 'Bob',
        totalPoints: 90, raceWins: 0, fantasyWins: 0, podiums: 1, poles: 0,
        fastestLaps: 0, q3Apps: 1, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
        races: [{ raceId: '2026_01', total: 18 }],
        drivers: [
          { driverId: 'charles_leclerc', name: 'Charles Leclerc', totalPoints: 90, wins: 0, podiums: 1, fastestLaps: 0, position: 2 }
        ]
      },
      raceComparisons: [
        { raceId: '2026_01', raceName: 'Australian Grand Prix', player1Total: 25, player2Total: 18, winner: 'player_1', margin: 7 }
      ],
      driverMatchups: {
        matchups: [{
          team: 'Red Bull Racing',
          driver1Id: 'max_verstappen', driver2Id: 'charles_leclerc',
          driver1Code: 'VER', driver2Code: 'LEC',
          driver1Points: 100, driver2Points: 90,
          driver1Wins: 1, driver2Wins: 0,
          driver1Podiums: 2, driver2Podiums: 1,
          driver1Poles: 1, driver2Poles: 0,
          driver1FastestLaps: 1, driver2FastestLaps: 0,
          driver1QualiBeats: 1, driver2QualiBeats: 0,
          driver1RaceBeats: 1, driver2RaceBeats: 0,
          driver1DNFs: 0, driver2DNFs: 0,
          driver1Q3Apps: 2, driver2Q3Apps: 1,
          driver1Q2Outs: 0, driver2Q2Outs: 0,
          driver1Q1Outs: 0, driver2Q1Outs: 0,
          winner: 'player1', margin: 10
        }]
      }
    });

    beforeEach(() => {
      mockDraftStore.draft = {
        status: 'completed',
        season: 2026,
        players: [
          { playerId: 'player_1', name: 'Alice', roster: ['max_verstappen'] },
          { playerId: 'player_2', name: 'Bob', roster: ['charles_leclerc'] }
        ]
      };
      mockFantasyTeamScorer.compareTeams.mockReturnValue(makeFullComparison());
    });

    it('renders driver contributions section', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.querySelector('.driver-contributions')).not.toBeNull();
    });

    it('renders the contribution table for each player', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.querySelectorAll('.contribution-table').length).toBe(2);
    });

    it('renders race breakdown section with race data', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.querySelector('.race-breakdown')).not.toBeNull();
      expect(compPanel.textContent).toContain('Australian GP');
    });

    it('renders points trend section', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.querySelector('.points-trend')).not.toBeNull();
    });

    it('renders the Back to Draft button', async () => {
      await view.render(container, {});
      const compPanel = container.querySelector('#tab-comparison');
      expect(compPanel.textContent).toContain('Back to Draft');
    });
  });

  // ─── Points trend chart (fake timers + Chart.js mock) ─────────────────────

  describe('points trend chart rendering', () => {
    const makeFullComparison = () => ({
      leader: 'player_1',
      margin: 10,
      ties: 0,
      player1: {
        playerId: 'player_1', name: 'Alice',
        totalPoints: 100, raceWins: 1, fantasyWins: 1, podiums: 2, poles: 1,
        fastestLaps: 1, q3Apps: 2, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
        races: [{ raceId: '2026_01', total: 25 }],
        drivers: [{ driverId: 'max_verstappen', name: 'Max Verstappen', totalPoints: 100, wins: 1, podiums: 2, fastestLaps: 1, position: 1 }]
      },
      player2: {
        playerId: 'player_2', name: 'Bob',
        totalPoints: 90, raceWins: 0, fantasyWins: 0, podiums: 1, poles: 0,
        fastestLaps: 0, q3Apps: 1, q2Outs: 0, q1Outs: 0, dnfs: 0, dns: 0,
        races: [{ raceId: '2026_01', total: 18 }],
        drivers: [{ driverId: 'charles_leclerc', name: 'Charles Leclerc', totalPoints: 90, wins: 0, podiums: 1, fastestLaps: 0, position: 2 }]
      },
      raceComparisons: [
        { raceId: '2026_01', raceName: 'Australian Grand Prix', player1Total: 25, player2Total: 18, winner: 'player_1', margin: 7 }
      ],
      driverMatchups: {
        matchups: [{
          team: 'Red Bull Racing', driver1Id: 'max_verstappen', driver2Id: 'charles_leclerc',
          driver1Code: 'VER', driver2Code: 'LEC',
          driver1Points: 100, driver2Points: 90,
          driver1Wins: 1, driver2Wins: 0,
          driver1Podiums: 2, driver2Podiums: 1,
          driver1Poles: 1, driver2Poles: 0, driver1FastestLaps: 1, driver2FastestLaps: 0,
          driver1QualiBeats: 1, driver2QualiBeats: 0, driver1RaceBeats: 1, driver2RaceBeats: 0,
          driver1DNFs: 0, driver2DNFs: 0, driver1Q3Apps: 2, driver2Q3Apps: 1,
          driver1Q2Outs: 0, driver2Q2Outs: 0, driver1Q1Outs: 0, driver2Q1Outs: 0,
          winner: 'player1', margin: 10
        }]
      }
    });

    beforeEach(() => {
      vi.useFakeTimers();
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
      global.Chart = vi.fn().mockImplementation((ctx, config) => {
        const opts = config?.options || {};
        const tryCall = (fn, ...args) => { try { if (typeof fn === 'function') fn(...args); } catch(e) {} };
        tryCall(opts.plugins?.tooltip?.callbacks?.label, { dataset: { label: 'Alice', playerId: 1 }, parsed: { y: 25 }, datasetIndex: 0, dataIndex: 0, chart: { data: { datasets: [{ data: [25] }, { data: [18] }] } } });
        tryCall(opts.scales?.y?.ticks?.callback, 1);
        return { destroy: vi.fn(), update: vi.fn() };
      });

      mockDraftStore.draft = {
        status: 'completed',
        season: 2026,
        players: [
          { playerId: 'player_1', name: 'Alice', roster: ['max_verstappen'] },
          { playerId: 'player_2', name: 'Bob', roster: ['charles_leclerc'] }
        ]
      };
      mockFantasyTeamScorer.compareTeams.mockReturnValue(makeFullComparison());
    });

    afterEach(() => {
      vi.useRealTimers();
      delete global.Chart;
      delete HTMLCanvasElement.prototype.getContext;
    });

    it('creates a Chart instance for the points trend', async () => {
      await view.render(container, {});
      vi.runAllTimers();
      expect(global.Chart).toHaveBeenCalled();
    });
  });

  // ─── Championship progression charts (fake timers + Chart.js mock) ─────────

  describe('championship progression charts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({});
      global.Chart = vi.fn().mockImplementation((ctx, config) => {
        const opts = config?.options || {};
        const tryCall = (fn, ...args) => { try { if (typeof fn === 'function') fn(...args); } catch(e) {} };
        tryCall(opts.plugins?.tooltip?.callbacks?.label, { dataset: { label: 'VER', playerId: 1 }, parsed: { y: 1 }, datasetIndex: 0, dataIndex: 0, chart: { data: { datasets: [{ data: [25] }] } } });
        tryCall(opts.scales?.y?.ticks?.callback, 1);
        tryCall(opts.scales?.y?.ticks?.callback, 'P');
        return { destroy: vi.fn(), update: vi.fn() };
      });

      // Restore standings data (may have been cleared by a prior test)
      mockDataStore.data.driverSeasonSummary = [
        { driverId: 'max_verstappen', season: 2026, position: 1, points: 200, wins: 5 },
        { driverId: 'charles_leclerc', season: 2026, position: 2, points: 170, wins: 3 }
      ];
      mockDataStore.data.constructorSeasonSummary = [
        { constructorId: 'red_bull', season: 2026, position: 1, points: 260, wins: 5 },
        { constructorId: 'ferrari', season: 2026, position: 2, points: 240, wins: 3 }
      ];
      mockDataStore.data.races = [
        { raceId: '2026_01', raceName: 'Australian Grand Prix', round: 1, season: 2026 }
      ];
      mockDataStore.getRaceResults.mockReturnValue([
        { driverId: 'max_verstappen', points: 25, raceId: '2026_01' }
      ]);
      mockDataStore.indexes.driverById = new Map([
        ['max_verstappen', { driverId: 'max_verstappen', name: 'Max Verstappen', code: 'VER', constructorId: 'red_bull' }],
        ['charles_leclerc', { driverId: 'charles_leclerc', name: 'Charles Leclerc', code: 'LEC', constructorId: 'ferrari' }]
      ]);
    });

    afterEach(() => {
      vi.useRealTimers();
      delete global.Chart;
      delete HTMLCanvasElement.prototype.getContext;
    });

    it('renders rank progression chart in driver standings tab', async () => {
      await view.render(container, {});
      vi.runAllTimers();
      expect(container.querySelector('.rank-progression')).not.toBeNull();
    });

    it('renders points progression chart in driver standings tab', async () => {
      await view.render(container, {});
      vi.runAllTimers();
      expect(container.querySelector('.points-progression')).not.toBeNull();
    });

    it('creates Chart instances for driver and constructor charts', async () => {
      await view.render(container, {});
      vi.runAllTimers();
      // driver rank + driver points + constructor rank + constructor points = 4 charts
      expect(global.Chart).toHaveBeenCalled();
    });

    it('shows "no results available" message when races exist but have no results', async () => {
      mockDataStore.getRaceResults.mockReturnValue([]);
      await view.render(container, {});
      vi.runAllTimers();
      const driverPanel = container.querySelector('#tab-driver-standings');
      expect(driverPanel.textContent).toMatch(/No race results are available yet|season has/i);
    });

    it('shows "no race data" message when no races are scheduled for the season', async () => {
      mockDataStore.data.races = [];
      await view.render(container, {});
      vi.runAllTimers();
      const driverPanel = container.querySelector('#tab-driver-standings');
      expect(driverPanel.textContent).toContain('No race data available');
    });
  });
});
