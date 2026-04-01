// tests/components/header.test.js
// Unit tests for the Header component

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Header } from '../../components/header.js';

// ─── Mock singletons ──────────────────────────────────────────────────────────

const { mockDraftStore, mockDataStore } = vi.hoisted(() => ({
  mockDraftStore: {
    currentSeason: 2026,
    draft: null,
    loadPlayerNames: vi.fn().mockReturnValue(null),
    setCurrentSeason: vi.fn()
  },
  mockDataStore: {
    season: 2026,
    setSeason: vi.fn()
  }
}));

vi.mock('../../lib/draft-store.js', () => ({ draftStore: mockDraftStore }));
vi.mock('../../lib/data-store.js', () => ({ dataStore: mockDataStore }));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Header', () => {
  let header;

  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '';
    header = new Header();
    vi.clearAllMocks();
    // Reset draft to null by default
    mockDraftStore.draft = null;
    mockDraftStore.currentSeason = 2026;
  });

  // ─── render() ─────────────────────────────────────────────────────────────

  describe('render()', () => {
    it('returns an HTMLElement', () => {
      const el = header.render();
      expect(el).toBeInstanceOf(HTMLElement);
    });

    it('returns a <header> with class app-header', () => {
      const el = header.render();
      expect(el.tagName.toLowerCase()).toBe('header');
      expect(el.classList.contains('app-header')).toBe(true);
    });

    it('stores the rendered element as this.element', () => {
      const el = header.render();
      expect(header.element).toBe(el);
    });

    it('includes a hamburger button for season selection', () => {
      const el = header.render();
      expect(el.querySelector('.season-hamburger')).not.toBeNull();
    });

    it('includes a logo with correct aria-label', () => {
      const el = header.render();
      const logo = el.querySelector('.header-wordmark');
      expect(logo).not.toBeNull();
      expect(logo.getAttribute('aria-label')).toBe('F1 Fantasy League Home');
    });

    it('includes a nav element with nav links', () => {
      const el = header.render();
      const nav = el.querySelector('nav.header-nav');
      expect(nav).not.toBeNull();
      const links = nav.querySelectorAll('.nav-link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('includes nav links for Draft, Calendar, Drivers, Constructors, Teams', () => {
      const el = header.render();
      const labels = Array.from(el.querySelectorAll('.nav-label')).map(n => n.textContent);
      expect(labels).toContain('Draft');
      expect(labels).toContain('Calendar');
      expect(labels).toContain('Drivers');
      expect(labels).toContain('Constructors');
      expect(labels).toContain('Teams');
    });

    it('sets --era-accent CSS variable on the header', () => {
      const el = header.render();
      expect(el.style.getPropertyValue('--era-accent')).not.toBe('');
    });

    it('sets data-era attribute on the header', () => {
      const el = header.render();
      expect(el.dataset.era).toBeTruthy();
    });

    it('includes a season badge showing the current season', () => {
      mockDraftStore.currentSeason = 2026;
      const el = header.render();
      const badge = el.querySelector('.season-current-badge');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe('2026');
    });

    it('shows player names when a draft with players exists', () => {
      mockDraftStore.draft = {
        players: [
          { name: 'Alice', playerId: 'player_1' },
          { name: 'Bob', playerId: 'player_2' }
        ]
      };
      const el = header.render();
      const statusText = el.querySelector('.draft-players');
      expect(statusText).not.toBeNull();
      expect(statusText.textContent).toBe('Alice vs Bob');
    });

    it('does not show player names when there is no draft', () => {
      mockDraftStore.draft = null;
      const el = header.render();
      expect(el.querySelector('.draft-players')).toBeNull();
    });

    it('includes a settings button', () => {
      const el = header.render();
      const btn = el.querySelector('.btn-settings');
      expect(btn).not.toBeNull();
      expect(btn.getAttribute('aria-label')).toBe('Settings');
    });
  });

  // ─── destroy() ────────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('removes the element from the DOM', () => {
      document.body.appendChild(header.render());
      expect(document.querySelector('.app-header')).not.toBeNull();
      header.destroy();
      expect(document.querySelector('.app-header')).toBeNull();
    });

    it('sets this.element to null after destroy', () => {
      document.body.appendChild(header.render());
      header.destroy();
      expect(header.element).toBeNull();
    });

    it('does not throw when called before render', () => {
      expect(() => header.destroy()).not.toThrow();
    });

    it('does not throw when destroy is called twice', () => {
      document.body.appendChild(header.render());
      header.destroy();
      expect(() => header.destroy()).not.toThrow();
    });
  });

  // ─── updateActiveLink() ────────────────────────────────────────────────────

  describe('updateActiveLink()', () => {
    it('does not throw when element is null', () => {
      expect(() => header.updateActiveLink()).not.toThrow();
    });

    it('marks the matching nav link as active', () => {
      window.location.hash = '#/calendar';
      header.render();
      header.updateActiveLink();
      const links = header.element.querySelectorAll('.nav-link');
      const calendarLink = Array.from(links).find(l => l.getAttribute('href') === '#/calendar');
      expect(calendarLink).not.toBeNull();
      expect(calendarLink.classList.contains('active')).toBe(true);
    });

    it('removes active class from all other links', () => {
      window.location.hash = '#/drivers';
      header.render();
      header.updateActiveLink();
      const links = header.element.querySelectorAll('.nav-link');
      const inactiveLinks = Array.from(links).filter(l => l.getAttribute('href') !== '#/drivers');
      inactiveLinks.forEach(l => {
        expect(l.classList.contains('active')).toBe(false);
      });
    });
  });

  // ─── Season drawer ────────────────────────────────────────────────────────

  describe('openSeasonDrawer() / closeSeasonDrawer()', () => {
    it('adds .season-drawer-overlay to body when opened', () => {
      header.render();
      expect(document.querySelector('.season-drawer-overlay')).toBeNull();
      header.openSeasonDrawer();
      expect(document.querySelector('.season-drawer-overlay')).not.toBeNull();
    });

    it('does not add a second overlay if already open', () => {
      header.render();
      header.openSeasonDrawer();
      header.openSeasonDrawer();
      expect(document.querySelectorAll('.season-drawer-overlay').length).toBe(1);
    });

    it('does not throw when closeSeasonDrawer is called with no open drawer', () => {
      expect(() => header.closeSeasonDrawer()).not.toThrow();
    });

    it('the drawer contains year buttons', () => {
      header.render();
      header.openSeasonDrawer();
      const yearBtns = document.querySelectorAll('.season-year-btn');
      expect(yearBtns.length).toBeGreaterThan(0);
    });

    it('marks the current season year button as active', () => {
      mockDraftStore.currentSeason = 2026;
      header.render();
      header.openSeasonDrawer();
      const activeBtn = document.querySelector('.season-year-btn.active');
      expect(activeBtn).not.toBeNull();
      expect(activeBtn.textContent).toBe('2026');
    });
  });
});
