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

    // Load data
    if (!dataStore.loaded) {
      await dataStore.load();
    }

    this.root.innerHTML = '';

    // Header
    this.renderHeader();

    // Drivers grid
    this.renderDriversGrid();
  }

  renderHeader() {
    const header = this.createElement('div', 'drivers-header');

    const title = this.createElement('h1', 'page-title', 'Drivers');
    header.appendChild(title);

    const subtitle = this.createElement('p', 'page-subtitle', `${dataStore.season} F1 Drivers`);
    header.appendChild(subtitle);

    this.root.appendChild(header);
  }

  renderDriversGrid() {
    const drivers = dataStore.data.drivers;

    if (drivers.length === 0) {
      const emptyMessage = this.createElement('div', 'empty-state');
      emptyMessage.innerHTML = '<p>No driver data available</p>';
      this.root.appendChild(emptyMessage);
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
      const driverCard = this.createElement('div', 'driver-card');
      driverCard.style.cursor = 'pointer';
      driverCard.addEventListener('click', () => {
        window.location.hash = `#/driver/${driver.driverId}`;
      });

      // Driver photo
      const photoWrapper = this.createElement('div', 'driver-photo-wrapper');
      const photo = document.createElement('img');
      photo.src = driver.photoUrl;
      photo.alt = driver.name;
      photo.className = 'driver-photo';
      photo.loading = 'lazy';

      // Add fallback styling if image fails to load
      photo.addEventListener('error', () => {
        // Only fallback for non-data URI sources
        if (!photo.src.startsWith('data:')) {
          photo.style.display = 'none';
          const fallback = this.createElement('div', 'photo-fallback');
          fallback.textContent = driver.code;
          fallback.style.background = driver.teamColor;
          photoWrapper.appendChild(fallback);
        }
      });

      photoWrapper.appendChild(photo);
      driverCard.appendChild(photoWrapper);

      // Team color bar
      const colorBar = this.createElement('div', 'driver-team-bar');
      colorBar.style.background = driver.teamColor;
      driverCard.appendChild(colorBar);

      // Driver info
      const infoSection = this.createElement('div', 'driver-info-section');

      // Driver code
      const code = this.createElement('div', 'driver-code', driver.code);
      code.style.color = driver.teamColor;
      infoSection.appendChild(code);

      // Driver name
      const name = this.createElement('h2', 'driver-name', driver.name);
      infoSection.appendChild(name);

      // Team name
      const team = this.createElement('div', 'driver-team', driver.team);
      infoSection.appendChild(team);

      // Nationality
      const nationality = this.createElement('div', 'driver-nationality', driver.nationality);
      infoSection.appendChild(nationality);

      // Season stats
      const summary = dataStore.getDriverSeasonSummary(dataStore.season, driver.driverId);
      if (summary) {
        const statsGrid = this.createElement('div', 'driver-stats-grid');

        const stats = [
          { label: 'Position', value: summary.position },
          { label: 'Points', value: summary.points },
          { label: 'Wins', value: summary.wins }
        ];

        stats.forEach(stat => {
          const statEl = this.createElement('div', 'driver-stat');
          const display = (stat.value == null || (typeof stat.value === 'number' && isNaN(stat.value))) ? '—' : stat.value.toString();
          const value = this.createElement('div', 'stat-value', display);
          const label = this.createElement('div', 'stat-label', stat.label);
          statEl.appendChild(value);
          statEl.appendChild(label);
          statsGrid.appendChild(statEl);
        });

        infoSection.appendChild(statsGrid);
      }

      driverCard.appendChild(infoSection);
      driversGrid.appendChild(driverCard);
    });

    this.root.appendChild(driversGrid);
  }
}
