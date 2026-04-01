// tests/integration/view-manager.integration.test.js
// Integration tests for the ViewManager + BaseView lifecycle.
// Mocks the Header component (heavy UI dependency) but uses real ViewManager + BaseView.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Header component to avoid pulling in singleton dependencies
vi.mock('../../components/header.js', () => ({
  Header: class {
    render() {
      const el = document.createElement('nav');
      el.className = 'header';
      el.textContent = 'Header';
      return el;
    }
    updateActiveLink() {}
  }
}));

import { ViewManager } from '../../views/view-manager.js';
import { BaseView } from '../../views/base-view.js';

// ─── Minimal concrete view for testing ───────────────────────────────────────

class StubView extends BaseView {
  constructor(name) {
    super();
    this.viewName = name;
    this.renderCount = 0;
    this.lastParams = null;
  }
  render(container, params) {
    this.renderCount++;
    this.lastParams = params;
    this.root = container;
    const el = this.createElement('div', ['stub-content'], `View: ${this.viewName}`);
    container.appendChild(el);
  }
}

describe('ViewManager + BaseView Integration', () => {
  let appEl;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    appEl = document.getElementById('app');
  });

  // ─── View registration & navigation ────────────────────────────────────────

  describe('View registration and navigation', () => {
    it('registers and renders a view on navigateTo', async () => {
      const vm = new ViewManager();
      const view = new StubView('draft');
      vm.registerView('draft', view);

      await vm.navigateTo('draft');

      expect(view.renderCount).toBe(1);
      expect(appEl.querySelector('.stub-content')).toBeTruthy();
      expect(appEl.textContent).toContain('View: draft');
    });

    it('destroys previous view when navigating to a new one', async () => {
      const vm = new ViewManager();
      const view1 = new StubView('draft');
      const view2 = new StubView('calendar');
      vm.registerView('draft', view1);
      vm.registerView('calendar', view2);

      await vm.navigateTo('draft');
      expect(view1.renderCount).toBe(1);

      await vm.navigateTo('calendar');
      expect(view2.renderCount).toBe(1);
      expect(appEl.textContent).not.toContain('View: draft');
      expect(appEl.textContent).toContain('View: calendar');
    });

    it('passes parsed params to view render method', async () => {
      const vm = new ViewManager();
      const view = new StubView('race');
      vm.registerView('race', view);

      // ViewManager.navigateTo converts array params via parseParams
      await vm.navigateTo('race', ['2026_01']);
      expect(view.lastParams).toEqual({ raceId: '2026_01' });
    });

    it('shows error message for unregistered view', async () => {
      const vm = new ViewManager();
      await vm.navigateTo('nonexistent');
      expect(appEl.textContent).toContain('View not found');
    });
  });

  // ─── BaseView helpers ──────────────────────────────────────────────────────

  describe('BaseView helper integration', () => {
    it('createElement creates element with classes and text', () => {
      const view = new StubView('test');
      const el = view.createElement('span', ['highlight', 'bold'], 'Hello');

      expect(el.tagName).toBe('SPAN');
      expect(el.classList.contains('highlight')).toBe(true);
      expect(el.classList.contains('bold')).toBe(true);
      expect(el.textContent).toBe('Hello');
    });

    it('createElement filters empty class strings', () => {
      const view = new StubView('test');
      const el = view.createElement('div', ['valid', '', null, 'another']);

      expect(el.classList.contains('valid')).toBe(true);
      expect(el.classList.contains('another')).toBe(true);
      expect(el.classList.length).toBe(2);
    });

    it('createLoadingSpinner returns spinner DOM element', () => {
      const view = new StubView('test');
      const spinner = view.createLoadingSpinner();

      expect(spinner.classList.contains('loading-spinner')).toBe(true);
    });

    it('createErrorMessage renders message text', () => {
      const view = new StubView('test');
      const err = view.createErrorMessage('Something went wrong');

      expect(err.classList.contains('error-message')).toBe(true);
      expect(err.textContent).toContain('Something went wrong');
    });

    it('destroy clears root element', () => {
      const view = new StubView('test');
      const container = document.createElement('div');
      container.innerHTML = '<p>Old content</p>';
      view.root = container;

      view.destroy();
      expect(container.innerHTML).toBe('');
    });
  });

  // ─── Multi-view lifecycle ──────────────────────────────────────────────────

  describe('Multi-view lifecycle', () => {
    it('handles rapid navigation between views', async () => {
      const vm = new ViewManager();
      const views = {};
      for (const name of ['draft', 'calendar', 'teams', 'drivers']) {
        views[name] = new StubView(name);
        vm.registerView(name, views[name]);
      }

      await vm.navigateTo('draft');
      await vm.navigateTo('calendar');
      await vm.navigateTo('teams');
      await vm.navigateTo('drivers');

      expect(views.draft.renderCount).toBe(1);
      expect(views.calendar.renderCount).toBe(1);
      expect(views.teams.renderCount).toBe(1);
      expect(views.drivers.renderCount).toBe(1);
      expect(appEl.textContent).toContain('View: drivers');
    });

    it('can navigate back to a previously-rendered view', async () => {
      const vm = new ViewManager();
      const view = new StubView('draft');
      vm.registerView('draft', view);
      vm.registerView('calendar', new StubView('calendar'));

      await vm.navigateTo('draft');
      await vm.navigateTo('calendar');
      await vm.navigateTo('draft');

      expect(view.renderCount).toBe(2);
      expect(appEl.textContent).toContain('View: draft');
    });

    it('renders header on every navigation', async () => {
      const vm = new ViewManager();
      vm.registerView('draft', new StubView('draft'));
      vm.registerView('calendar', new StubView('calendar'));

      await vm.navigateTo('draft');
      expect(appEl.querySelector('.header')).toBeTruthy();

      await vm.navigateTo('calendar');
      expect(appEl.querySelector('.header')).toBeTruthy();
    });
  });
});
