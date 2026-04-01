// tests/views/view-manager.test.js
// Unit tests for ViewManager routing

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewManager } from '../../views/view-manager.js';

// ─── Mock modules ──────────────────────────────────────────────────────────────
// Prevent Header from importing real dataStore / draftStore

vi.mock('../../lib/data-store.js', () => ({
  dataStore: {
    loaded: true,
    season: 2026,
    data: { races: [], drivers: [], constructors: [] },
    indexes: { driverById: new Map(), constructorById: new Map(), raceById: new Map() },
    load: vi.fn().mockResolvedValue(true),
    setSeason: vi.fn()
  }
}));

vi.mock('../../lib/draft-store.js', () => ({
  draftStore: {
    currentSeason: 2026,
    draft: null,
    loadCurrentSeason: vi.fn(),
    loadPlayerNames: vi.fn().mockReturnValue(null)
  }
}));

// Mock Header component — keeps tests focused on routing logic
vi.mock('../../components/header.js', () => ({
  Header: class MockHeader {
    render() {
      const el = document.createElement('header');
      el.className = 'app-header';
      return el;
    }
    updateActiveLink() {}
  }
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeView() {
  return {
    render: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn()
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ViewManager', () => {
  let manager;

  beforeEach(() => {
    // Set up the #app container required by ViewManager constructor
    document.body.innerHTML = '<div id="app"></div>';
    manager = new ViewManager();
  });

  // ─── registerView ──────────────────────────────────────────────────────────

  describe('registerView', () => {
    it('stores the view instance under the given name', () => {
      const view = makeView();
      manager.registerView('draft', view);
      expect(manager.views.get('draft')).toBe(view);
    });

    it('can register multiple distinct views', () => {
      const v1 = makeView();
      const v2 = makeView();
      manager.registerView('draft', v1);
      manager.registerView('teams', v2);
      expect(manager.views.size).toBe(2);
    });
  });

  // ─── parseParams ──────────────────────────────────────────────────────────

  describe('parseParams', () => {
    it('extracts raceId for the "race" route', () => {
      const params = manager.parseParams('race', ['2026_01']);
      expect(params).toEqual({ raceId: '2026_01' });
    });

    it('extracts driverId for the "driver" route', () => {
      const params = manager.parseParams('driver', ['max_verstappen']);
      expect(params).toEqual({ driverId: 'max_verstappen' });
    });

    it('extracts constructorId for the "constructor" route', () => {
      const params = manager.parseParams('constructor', ['red_bull']);
      expect(params).toEqual({ constructorId: 'red_bull' });
    });

    it('returns an empty object for routes without params', () => {
      expect(manager.parseParams('draft', [])).toEqual({});
      expect(manager.parseParams('teams', [])).toEqual({});
      expect(manager.parseParams('calendar', [])).toEqual({});
    });

    it('ignores extra params for routes that do not need them', () => {
      const params = manager.parseParams('draft', ['extra', 'params']);
      expect(params).toEqual({});
    });
  });

  // ─── navigateTo ───────────────────────────────────────────────────────────

  describe('navigateTo', () => {
    it('calls render on the registered view', async () => {
      const view = makeView();
      manager.registerView('draft', view);
      await manager.navigateTo('draft', []);
      expect(view.render).toHaveBeenCalledOnce();
    });

    it('passes a contentContainer and parsed params to render', async () => {
      const view = makeView();
      manager.registerView('race', view);
      await manager.navigateTo('race', ['2026_03']);
      const [, params] = view.render.mock.calls[0];
      expect(params).toEqual({ raceId: '2026_03' });
    });

    it('calls destroy on the current view before switching', async () => {
      const view1 = makeView();
      const view2 = makeView();
      manager.registerView('draft', view1);
      manager.registerView('teams', view2);

      await manager.navigateTo('draft', []);
      await manager.navigateTo('teams', []);

      expect(view1.destroy).toHaveBeenCalledOnce();
    });

    it('sets currentView to the newly rendered view', async () => {
      const view = makeView();
      manager.registerView('calendar', view);
      await manager.navigateTo('calendar', []);
      expect(manager.currentView).toBe(view);
    });

    it('renders error message for an unknown view name', async () => {
      await manager.navigateTo('nonexistent', []);
      const appEl = document.getElementById('app');
      expect(appEl.textContent).toContain('View not found');
    });

    it('appends a header element to the container', async () => {
      const view = makeView();
      manager.registerView('draft', view);
      await manager.navigateTo('draft', []);
      const appEl = document.getElementById('app');
      expect(appEl.querySelector('.app-header')).not.toBeNull();
    });

    it('appends a .view-content container for the view', async () => {
      const view = makeView();
      manager.registerView('draft', view);
      await manager.navigateTo('draft', []);
      const appEl = document.getElementById('app');
      expect(appEl.querySelector('.view-content')).not.toBeNull();
    });
  });

  // ─── static navigate ──────────────────────────────────────────────────────

  describe('ViewManager.navigate', () => {
    it('sets window.location.hash to the given hash', () => {
      ViewManager.navigate('#/draft');
      expect(window.location.hash).toBe('#/draft');
    });
  });

  // ─── init ─────────────────────────────────────────────────────────────────

  describe('init', () => {
    it('calls handleRouteChange immediately on init', async () => {
      const view = makeView();
      manager.registerView('draft', view);
      window.location.hash = '#/draft';
      manager.init();
      await new Promise(r => setTimeout(r, 0)); // flush microtasks
      expect(view.render).toHaveBeenCalled();
    });

    it('responds to hashchange events after init', async () => {
      const draftView = makeView();
      const teamsView = makeView();
      manager.registerView('draft', draftView);
      manager.registerView('teams', teamsView);

      window.location.hash = '#/draft';
      manager.init();
      await new Promise(r => setTimeout(r, 0));

      // Change hash and fire hashchange to trigger the registered listener
      window.location.hash = '#/teams';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise(r => setTimeout(r, 0));

      expect(teamsView.render).toHaveBeenCalled();
    });
  });
});
