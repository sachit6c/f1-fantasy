// views/drivers-list-view.js
// List view showing all drivers

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class DriversListView extends BaseView {
  async render(container, params) {
    this.root = container;

    // Sync season from current season
    if (draftStore.currentSeason) {
      dataStore.setSeason(draftStore.currentSeason);
    }

    // Show skeleton while data loads
    if (!dataStore.loaded) {
      this.root.innerHTML = '';
      this.renderHeader();
      this.renderSkeletonGrid(20);
      await dataStore.load();
    }

    this.root.innerHTML = '';

    // Header
    this.renderHeader();

    // Drivers grid
    this.renderDriversGrid();
  }

  renderHeader() {
    const header = this.createPageHeader(
      'Drivers',
      `${dataStore.season} Formula 1 Drivers`
    );
    this.root.appendChild(header);
  }

  renderDriversGrid() {
    const drivers = dataStore.data.drivers;

    if (drivers.length === 0) {
      const empty = this.createEmptyState(
        `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>`,
        'No drivers found',
        'Driver data for this season hasn\'t been loaded yet.'
      );
      this.root.appendChild(empty);
      return;
    }

    // Sort drivers by championship position; unranked (no race yet) follow at end
    const sortedDrivers = [...drivers].sort((a, b) => {
      const summaryA = dataStore.getDriverSeasonSummary(dataStore.season, a.driverId);
      const summaryB = dataStore.getDriverSeasonSummary(dataStore.season, b.driverId);

      const posA = summaryA?.position;
      const posB = summaryB?.position;
      const rankedA = summaryA && posA != null;
      const rankedB = summaryB && posB != null;

      if (rankedA && rankedB) return posA - posB;
      if (rankedA) return -1;
      if (rankedB) return 1;
      return a.name.localeCompare(b.name);
    });

    const driversGrid = this.createElement('div', 'drivers-grid');

    sortedDrivers.forEach(driver => {
      const summary = dataStore.getDriverSeasonSummary(dataStore.season, driver.driverId);

      const driverCard = this.createElement('div', 'driver-card');
      driverCard.style.setProperty('--team-color', driver.teamColor || '#E10600');
      driverCard.addEventListener('click', () => {
        window.location.hash = `#/driver/${driver.driverId}`;
      });

      // ── Photo area ──────────────────────────────────────────────
      const photoArea = this.createElement('div', 'driver-card__photo-area');

      // Large translucent code watermark (behind photo)
      const codeBg = this.createElement('div', 'driver-card__code-bg');
      codeBg.textContent = driver.code || '';
      photoArea.appendChild(codeBg);

      // Driver photo
      const photo = document.createElement('img');
      photo.src = driver.photoUrl;
      photo.alt = driver.name;
      photo.className = 'driver-card__photo';
      photo.loading = 'lazy';

      photo.addEventListener('error', () => {
        if (!photo.src.startsWith('data:')) {
          const pngUrl = `data/images/drivers/${driver.driverId}.png`;
          if (!photo.src.endsWith('.png')) {
            photo.src = pngUrl;
            return;
          }
        }
        photo.remove();
        const fallback = this.createElement('div', 'driver-card__photo-fallback');
        fallback.textContent = driver.code || driver.name.slice(0, 3).toUpperCase();
        fallback.style.background = `linear-gradient(135deg, color-mix(in srgb, ${driver.teamColor || '#E10600'} 20%, #1a1f27), #1a1f27)`;
        photoArea.appendChild(fallback);
      });

      photoArea.appendChild(photo);

      // Position badge (if championship data available)
      if (summary && summary.position != null) {
        const badge = this.createElement('div', 'driver-card__position-badge');
        const badgeLabel = this.createElement('span', 'badge-label', 'POS');
        const badgeNum = this.createElement('span', 'badge-num', summary.position.toString());
        badge.appendChild(badgeLabel);
        badge.appendChild(badgeNum);
        photoArea.appendChild(badge);
      }

      driverCard.appendChild(photoArea);

      // ── Team accent stripe ───────────────────────────────────────
      const stripe = this.createElement('div', 'driver-card__stripe');
      driverCard.appendChild(stripe);

      // ── Info panel ───────────────────────────────────────────────
      const info = this.createElement('div', 'driver-card__info');

      // Driver name
      const name = this.createElement('h2', 'driver-card__name', driver.name);
      info.appendChild(name);

      // Meta row: team · nationality · code chip
      const metaRow = this.createElement('div', 'driver-card__meta-row');
      const teamName = this.createElement('span', 'driver-card__team-name', driver.team || '');
      const sep = this.createElement('span', 'driver-card__meta-sep', '·');
      const nat = this.createElement('span', 'driver-card__nat', driver.nationality || '');
      const codeChip = this.createElement('span', 'driver-card__code-chip', driver.code || '');
      metaRow.appendChild(teamName);
      metaRow.appendChild(sep);
      metaRow.appendChild(nat);
      metaRow.appendChild(codeChip);
      info.appendChild(metaRow);

      // Stats row
      const statsRow = this.createElement('div', 'driver-card__stats');
      const statDefs = [
        { key: 'POS',  value: summary?.position },
        { key: 'PTS',  value: summary?.points },
        { key: 'WINS', value: summary?.wins }
      ];

      statDefs.forEach(stat => {
        const isEmpty = stat.value == null || (typeof stat.value === 'number' && isNaN(stat.value));
        const display = isEmpty ? '—' : stat.value.toString();

        const statEl = this.createElement('div', 'driver-card__stat');
        const valEl = this.createElement('span', 'driver-card__stat-val', display);
        if (isEmpty) valEl.classList.add('empty');
        const keyEl = this.createElement('span', 'driver-card__stat-key', stat.key);
        statEl.appendChild(valEl);
        statEl.appendChild(keyEl);
        statsRow.appendChild(statEl);
      });

      info.appendChild(statsRow);
      driverCard.appendChild(info);
      driversGrid.appendChild(driverCard);
    });

    this.root.appendChild(driversGrid);
  }

  renderSkeletonGrid(count = 20) {
    const grid = this.createElement('div', 'drivers-grid');
    for (let i = 0; i < count; i++) {
      const card = this.createElement('div', 'driver-card');
      card.innerHTML = `
        <div class="driver-card__photo-area skeleton"></div>
        <div class="driver-card__stripe skeleton" style="height:3px;animation:none;opacity:0.3;"></div>
        <div class="driver-card__info">
          <div class="skeleton" style="height:15px;width:72%;border-radius:4px;"></div>
          <div class="skeleton" style="height:11px;width:52%;border-radius:4px;"></div>
          <div class="driver-card__stats" style="border-top:none;padding-top:0;">
            <div class="skeleton" style="height:28px;border-radius:4px;margin:0 4px;"></div>
            <div class="skeleton" style="height:28px;border-radius:4px;margin:0 4px;"></div>
            <div class="skeleton" style="height:28px;border-radius:4px;margin:0 4px;"></div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    }
    this.root.appendChild(grid);
  }
}
