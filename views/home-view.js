// views/home-view.js
// Dashboard / landing view — the first thing users see

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class HomeView extends BaseView {
  async render(container, params) {
    this.root = container;
    this.root.innerHTML = '';

    const view = this.createElement('div', 'home-view');

    // 1. Hero — renders immediately, no data needed
    view.appendChild(this._buildHero());

    // 2. Stats strip + content — render with skeleton then fill in
    const statsStrip = this._buildStatsStrip(null);
    view.appendChild(statsStrip);

    const content = this._buildContent(null, null);
    view.appendChild(content);

    this.root.appendChild(view);

    // Load data in background and update UI
    try {
      if (draftStore.currentSeason) {
        dataStore.setSeason(draftStore.currentSeason);
      }
      if (!dataStore.loaded) {
        await dataStore.load();
      }

      // Re-render stats strip and content with real data
      const filledStats = this._buildStatsStrip(dataStore.data);
      statsStrip.replaceWith(filledStats);

      const nextRace = this._findNextRace(dataStore.data.races);
      const filledContent = this._buildContent(dataStore.data, nextRace);
      content.replaceWith(filledContent);

    } catch (err) {
      console.warn('[HomeView] Data load error:', err);
    }
  }

  _buildHero() {
    const hero = this.createElement('div', 'home-hero');
    hero.innerHTML = `
      <div class="home-hero-inner">
        <span class="home-logo-badge">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#E10600"/>
            <text x="16" y="22" font-family="Arial Black, Arial" font-weight="900" font-size="13" fill="white" text-anchor="middle">F1</text>
          </svg>
          Formula 1 Fantasy
        </span>
        <h1 class="home-hero-title">
          Your <span>Pit Wall</span>,<br>every race.
        </h1>
        <p class="home-hero-tagline">
          Draft your team, track every session, and compete across all eras of Formula 1.
        </p>
        <div class="home-hero-actions">
          <a href="#/draft" class="btn-primary" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.625rem 1.25rem;border-radius:0.5rem;font-weight:600;font-size:0.9375rem;text-decoration:none;background:var(--color-primary);color:#fff;border:1px solid var(--color-primary);transition:background 120ms ease,box-shadow 120ms ease;">
            ${_iconDraft(18)} Start Draft
          </a>
          <a href="#/calendar" class="btn-secondary" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.625rem 1.25rem;border-radius:0.5rem;font-weight:500;font-size:0.9375rem;text-decoration:none;background:var(--color-bg-elevated);color:var(--color-text-primary);border:1px solid var(--color-border-strong);transition:background 120ms ease;">
            ${_iconCalendar(18)} Race Calendar
          </a>
        </div>
      </div>
    `;
    return hero;
  }

  _buildStatsStrip(data) {
    const strip = this.createElement('div', 'home-stats-strip');
    const season  = draftStore.currentSeason || dataStore.season || 2026;
    const drivers = data ? data.drivers.length : null;
    const races   = data ? data.races.length  : null;
    const teams   = data ? data.constructors.length : null;

    const items = [
      { value: season, label: 'Season' },
      { value: races   ?? '—', label: 'Races' },
      { value: drivers ?? '—', label: 'Drivers' },
      { value: teams   ?? '—', label: 'Teams' },
    ];

    items.forEach(item => {
      const el = this.createElement('div', 'home-stat-item');
      el.innerHTML = `
        <div class="home-stat-value">${item.value}</div>
        <div class="home-stat-label">${item.label}</div>
      `;
      strip.appendChild(el);
    });

    return strip;
  }

  _buildContent(data, nextRace) {
    const content = this.createElement('div', 'home-content');

    // Row: next race + draft status
    const row = this.createElement('div', 'home-cards-row');
    row.appendChild(this._buildNextRaceCard(nextRace));
    row.appendChild(this._buildDraftCard());
    content.appendChild(row);

    // Explore section
    content.appendChild(this._buildExploreSection());

    return content;
  }

  _buildNextRaceCard(race) {
    const card = this.createElement('div', 'home-race-card');

    if (!race) {
      card.innerHTML = `
        <div class="home-card-label">
          <span class="live-dot"></span> Next Race
        </div>
        <div class="skeleton" style="height:28px;width:70%;border-radius:6px;"></div>
        <div class="skeleton" style="height:16px;width:50%;border-radius:4px;"></div>
        <div class="home-countdown" style="gap:var(--spacing-sm);">
          ${['D','H','M','S'].map(u => `
            <div class="home-countdown-unit">
              <div class="skeleton" style="height:32px;width:44px;border-radius:6px;"></div>
              <div class="home-countdown-label">${u}</div>
            </div>`).join('')}
        </div>
      `;
      return card;
    }

    const raceDate = race.date ? new Date(race.date) : null;

    card.innerHTML = `
      <div class="home-card-label">
        <span class="live-dot"></span> Next Race
      </div>
      <div class="home-race-name">${race.name || race.raceName || 'Grand Prix'}</div>
      <div class="home-race-meta">
        <div class="home-race-meta-row">
          ${_iconCalendar(14)}
          ${raceDate ? raceDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBC'}
        </div>
        ${race.circuit ? `<div class="home-race-meta-row">${_iconLocation(14)} ${race.circuit}</div>` : ''}
        ${race.country ? `<div class="home-race-meta-row">${_iconFlag(14)} ${race.country}</div>` : ''}
        ${race.round   ? `<div class="home-race-meta-row">${_iconHash(14)} Round ${race.round}</div>` : ''}
      </div>
      <div class="home-countdown" id="home-countdown-${race.raceId || 'next'}"></div>
    `;

    if (raceDate) {
      this._startCountdown(card.querySelector('.home-countdown'), raceDate);
    }

    // Make card clickable
    if (race.raceId) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.hash = `#/race/${race.raceId}`;
      });
    }

    return card;
  }

  _startCountdown(el, targetDate) {
    const render = () => {
      const now  = new Date();
      const diff = targetDate - now;

      if (!el.isConnected) { clearInterval(this._countdownTimer); return; }

      if (diff <= 0) {
        el.innerHTML = `<span style="color:var(--color-primary);font-weight:700;font-size:var(--font-size-sm);">Race day!</span>`;
        clearInterval(this._countdownTimer);
        return;
      }

      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000)  / 60000);
      const secs  = Math.floor((diff % 60000)    / 1000);

      el.innerHTML = [
        { v: days,  l: 'Days' },
        { v: hours, l: 'Hrs' },
        { v: mins,  l: 'Min' },
        { v: secs,  l: 'Sec' },
      ].map(u => `
        <div class="home-countdown-unit">
          <div class="home-countdown-value">${String(u.v).padStart(2, '0')}</div>
          <div class="home-countdown-label">${u.l}</div>
        </div>
      `).join('');
    };

    render();
    this._countdownTimer = setInterval(render, 1000);
  }

  _buildDraftCard() {
    const card = this.createElement('div', 'home-draft-card');

    const draft  = draftStore.draft;
    const season = draftStore.currentSeason || 2026;

    if (!draft || !draft.players) {
      card.innerHTML = `
        <div class="home-card-label">${_iconDraft(14)} Draft Status</div>
        <div class="home-race-name" style="font-size:var(--font-size-lg)">No Draft Yet</div>
        <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin:0;line-height:var(--line-height-normal)">
          Start a draft to pick your teams and compete across the ${season} season.
        </p>
        <a href="#/draft" class="btn-primary" style="display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;margin-top:auto;padding:0.5rem 1rem;border-radius:0.5rem;font-weight:600;font-size:0.875rem;text-decoration:none;background:var(--color-primary);color:#fff;border:1px solid var(--color-primary);">
          ${_iconDraft(15)} Start Draft
        </a>
      `;
      return card;
    }

    const [p1, p2] = draft.players;
    const totalPicks = draft.picks ? draft.picks.length : 0;
    const status = draft.status || 'setup';

    const statusLabel = {
      setup:       'Setup',
      in_progress: 'In Progress',
      completed:   'Completed',
    }[status] || status;

    const statusColor = {
      setup:       'var(--color-text-muted)',
      in_progress: 'var(--color-warning)',
      completed:   'var(--color-success)',
    }[status] || 'var(--color-text-secondary)';

    card.innerHTML = `
      <div class="home-card-label">
        ${_iconDraft(14)} Draft Status
        <span style="margin-left:auto;color:${statusColor};font-size:var(--font-size-xs);font-weight:600;">${statusLabel}</span>
      </div>
      <div class="home-draft-players">
        <div class="home-player-chip">
          <div class="home-player-name">${p1.name}</div>
          <div class="home-player-picks">${p1.roster ? p1.roster.length : 0} picks</div>
        </div>
        <div class="home-vs">vs</div>
        <div class="home-player-chip">
          <div class="home-player-name">${p2.name}</div>
          <div class="home-player-picks">${p2.roster ? p2.roster.length : 0} picks</div>
        </div>
      </div>
      <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin:0;">${totalPicks} picks made · ${season} season</p>
      <div style="display:flex;gap:var(--spacing-sm);margin-top:auto;flex-wrap:wrap;">
        <a href="#/draft" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:0.5rem;font-weight:600;font-size:0.875rem;text-decoration:none;background:var(--color-primary);color:#fff;border:1px solid var(--color-primary);">
          ${_iconDraft(15)} Draft Room
        </a>
        <a href="#/teams" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;border-radius:0.5rem;font-weight:500;font-size:0.875rem;text-decoration:none;background:var(--color-bg-elevated);color:var(--color-text-primary);border:1px solid var(--color-border-strong);">
          View Teams
        </a>
      </div>
    `;

    return card;
  }

  _buildExploreSection() {
    const section = this.createElement('div', 'home-explore-section');
    section.innerHTML = `<div class="home-section-title">Explore</div>`;

    const grid = this.createElement('div', ['home-explore-grid', 'stagger-children']);

    const items = [
      {
        label: 'Drivers',
        desc:  'Championship standings, career stats, and profiles.',
        hash:  '#/drivers',
        icon:  _iconDriver(20),
      },
      {
        label: 'Constructors',
        desc:  'Team results, points, and season performance.',
        hash:  '#/constructors',
        icon:  _iconCar(20),
      },
      {
        label: 'Race Calendar',
        desc:  'Full season schedule with circuit details.',
        hash:  '#/calendar',
        icon:  _iconCalendar(20),
      },
      {
        label: 'Team Comparison',
        desc:  'Head-to-head fantasy scoring across all rounds.',
        hash:  '#/teams',
        icon:  _iconTeams(20),
      },
    ];

    items.forEach(item => {
      const card = this.createElement('a', 'home-explore-card');
      card.href = item.hash;
      card.innerHTML = `
        <div class="home-explore-icon">${item.icon}</div>
        <div class="home-explore-name">${item.label}</div>
        <div class="home-explore-desc">${item.desc}</div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    return section;
  }

  _findNextRace(races) {
    if (!races || !races.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = races
      .filter(r => r.date && new Date(r.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return upcoming[0] || races[races.length - 1];
  }

  destroy() {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
    super.destroy();
  }
}

// ─── SVG icon helpers ──────────────────────────────────────────────────────
function _iconDraft(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>`;
}

function _iconCalendar(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
}

function _iconLocation(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
}

function _iconFlag(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
}

function _iconHash(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;
}

function _iconDriver(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}

function _iconCar(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/><path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9"/></svg>`;
}

function _iconTeams(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`;
}
