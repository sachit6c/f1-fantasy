// views/race-detail-view.js
// Race detail view showing qualifying and race results

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class RaceDetailView extends BaseView {
  async render(container, params) {
    this.root = container;
    this.raceId = params.raceId;

    // Sync season from current season
    if (draftStore.currentSeason) {
      dataStore.setSeason(draftStore.currentSeason);
    }

    // Load data
    if (!dataStore.loaded) {
      await dataStore.load();
    }

    this.root.innerHTML = '';

    const race = dataStore.indexes.raceById.get(this.raceId);
    if (!race) {
      this.renderNotFound();
      return;
    }

    this.race = race;

    // Render components
    this.renderHeader();
    this.renderRaceInfo();
    this.renderResults();
  }

  renderNotFound() {
    const empty = this.createEmptyState(
      `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01"/>
      </svg>`,
      'Race not found',
      'The race you\'re looking for doesn\'t exist or has no data for this season.'
    );
    const backBtn = document.createElement('a');
    backBtn.href = '#/calendar';
    backBtn.className = 'btn btn-outline';
    backBtn.style.marginTop = 'var(--spacing-md)';
    backBtn.textContent = 'Back to Calendar';
    empty.appendChild(backBtn);
    this.root.appendChild(empty);
  }

  renderHeader() {
    const header = this.createElement('div', 'race-detail-header');

    const breadcrumb = this.createBreadcrumb([
      { label: 'Calendar', href: '#/calendar' },
      { label: this.race.raceName }
    ]);
    header.appendChild(breadcrumb);

    const title = this.createElement('h1', 'page-title', this.race.raceName);
    header.appendChild(title);

    const subtitle = this.createElement('div', 'race-subtitle');
    subtitle.innerHTML = `
      <span class="round-badge">Round ${this.race.round}</span>
      <span>${this.race.circuitName}</span>
      <span>${this.race.locality}, ${this.race.country}</span>
    `;
    header.appendChild(subtitle);

    this.root.appendChild(header);
  }

  renderRaceInfo() {
    const infoCard = this.createElement('div', 'race-info-card');

    const date = new Date(this.race.date);
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    infoCard.innerHTML = `
      <div class="info-item">
        <span class="info-label">Date</span>
        <span class="info-value">${dateStr}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Circuit</span>
        <span class="info-value">${this.race.circuitName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Location</span>
        <span class="info-value">${this.race.locality}, ${this.race.country}</span>
      </div>
    `;

    this.root.appendChild(infoCard);
  }

  renderResults() {
    const resultsSection = this.createElement('div', 'race-results-section');

    // Qualifying Results
    const qualifyingResults = dataStore.indexes.qualifyingByRace.get(this.raceId) || [];
    if (qualifyingResults.length > 0) {
      const qualifyingCard = this.createElement('div', 'results-card');
      const qualifyingTitle = this.createElement('h2', 'results-title', 'Qualifying Results');
      qualifyingCard.appendChild(qualifyingTitle);

      const qualifyingTable = this.renderQualifyingTable(qualifyingResults);
      const qualifyingWrapper = this.createElement('div', 'table-responsive');
      qualifyingWrapper.appendChild(qualifyingTable);
      qualifyingCard.appendChild(qualifyingWrapper);

      resultsSection.appendChild(qualifyingCard);
    }

    // Race Results
    const raceResults = dataStore.indexes.resultsByRace.get(this.raceId) || [];
    if (raceResults.length > 0) {
      const raceCard = this.createElement('div', 'results-card');
      const raceTitle = this.createElement('h2', 'results-title', 'Race Results');
      raceCard.appendChild(raceTitle);

      const raceTable = this.renderRaceResultsTable(raceResults);
      const raceWrapper = this.createElement('div', 'table-responsive');
      raceWrapper.appendChild(raceTable);
      raceCard.appendChild(raceWrapper);

      resultsSection.appendChild(raceCard);
    }

    if (qualifyingResults.length === 0 && raceResults.length === 0) {
      const noResults = this.createElement('div', 'empty-state');
      noResults.innerHTML = '<p>No results available for this race yet.</p>';
      resultsSection.appendChild(noResults);
    }

    this.root.appendChild(resultsSection);
  }

  renderQualifyingTable(results) {
    const table = this.createElement('table', 'results-table');

    // Check if there's a draft to show player ownership
    const hasDraft = draftStore.draft && draftStore.draft.status === 'completed';
    const playerDrivers = hasDraft ? {
      player1: draftStore.draft.players[0].roster,
      player2: draftStore.draft.players[1].roster
    } : null;

    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-pos">Pos</th>
          <th class="col-driver">Driver</th>
          <th class="col-team">Team</th>
          <th class="col-time">Q1</th>
          <th class="col-time">Q2</th>
          <th class="col-time">Q3</th>
          ${hasDraft ? '<th class="col-owner">Owner</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${results.map(result => {
          const driver = dataStore.indexes.driverById.get(result.driverId);
          let ownerClass = '';
          let ownerBadge = '';

          if (hasDraft && driver) {
            if (playerDrivers.player1.includes(result.driverId)) {
              ownerClass = 'player1-owned';
              ownerBadge = `<span class="owner-badge owner-p1">${draftStore.draft.players[0].name}</span>`;
            } else if (playerDrivers.player2.includes(result.driverId)) {
              ownerClass = 'player2-owned';
              ownerBadge = `<span class="owner-badge owner-p2">${draftStore.draft.players[1].name}</span>`;
            }
          }

          const pos = parseInt(result.position);
          const posClass = pos <= 3 ? `position position-p${pos}` : 'position';
          const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;

          const avatarSrc = `data/images/drivers/${result.driverId}.jpg`;
          const driverCode = driver ? (driver.code || driver.name.slice(0,3).toUpperCase()) : '?';
          const avatarHtml = `<img class="driver-avatar" src="${avatarSrc}"
            onerror="var p='data/images/drivers/${result.driverId}.png';if(this.src!==location.origin+'/'+p){this.src=p;}else{this.outerHTML='<span class=\\'driver-avatar driver-avatar-fallback\\'>${driverCode}</span>';}"
            alt="" loading="lazy">`;

          return `
            <tr class="${ownerClass}">
              <td class="${posClass}">${medal}</td>
              <td class="driver-name">
                <div class="driver-cell">
                  ${avatarHtml}
                  <a href="#/driver/${result.driverId}">${driver ? driver.name : result.driverId}</a>
                </div>
              </td>
              <td class="team-name">${driver && driver.constructorId ? `<a href="#/constructor/${driver.constructorId}">${driver.team}</a>` : (driver ? driver.team : '-')}</td>
              <td class="time">${result.q1 || '<span class="time-dash">—</span>'}</td>
              <td class="time">${result.q2 || '<span class="time-dash">—</span>'}</td>
              <td class="time">${result.q3 || '<span class="time-dash">—</span>'}</td>
              ${hasDraft ? `<td class="owner">${ownerBadge}</td>` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

    return table;
  }

  renderRaceResultsTable(results) {
    const table = this.createElement('table', 'results-table');

    // Check if there's a draft to show player ownership
    const hasDraft = draftStore.draft && draftStore.draft.status === 'completed';
    const playerDrivers = hasDraft ? {
      player1: draftStore.draft.players[0].roster,
      player2: draftStore.draft.players[1].roster
    } : null;

    table.innerHTML = `
      <thead>
        <tr>
          <th class="col-pos">Pos</th>
          <th class="col-driver">Driver</th>
          <th class="col-team">Team</th>
          <th class="col-grid">Grid</th>
          <th class="col-status">Status</th>
          <th class="col-points">Pts</th>
          ${hasDraft ? '<th class="col-owner">Owner</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${results.map(result => {
          const driver = dataStore.indexes.driverById.get(result.driverId);
          let ownerClass = '';
          let ownerBadge = '';

          if (hasDraft && driver) {
            if (playerDrivers.player1.includes(result.driverId)) {
              ownerClass = 'player1-owned';
              ownerBadge = `<span class="owner-badge owner-p1">${draftStore.draft.players[0].name}</span>`;
            } else if (playerDrivers.player2.includes(result.driverId)) {
              ownerClass = 'player2-owned';
              ownerBadge = `<span class="owner-badge owner-p2">${draftStore.draft.players[1].name}</span>`;
            }
          }

          const pos = parseInt(result.position);
          const posClass = pos <= 3 ? `position position-p${pos}` : 'position';
          const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : pos;

          const avatarSrc = `data/images/drivers/${result.driverId}.jpg`;
          const driverCode = driver ? (driver.code || driver.name.slice(0,3).toUpperCase()) : '?';
          const avatarHtml = `<img class="driver-avatar" src="${avatarSrc}"
            onerror="var p='data/images/drivers/${result.driverId}.png';if(this.src!==location.origin+'/'+p){this.src=p;}else{this.outerHTML='<span class=\\'driver-avatar driver-avatar-fallback\\'>${driverCode}</span>';}"
            alt="" loading="lazy">`;

          const pts = parseFloat(result.points);
          const ptsDisplay = pts > 0 ? `<strong>${pts}</strong>` : `<span class="points-zero">${pts}</span>`;

          return `
            <tr class="${ownerClass}">
              <td class="${posClass}">${medal}</td>
              <td class="driver-name">
                <div class="driver-cell">
                  ${avatarHtml}
                  <a href="#/driver/${result.driverId}">${driver ? driver.name : result.driverId}</a>
                </div>
              </td>
              <td class="team-name">${driver && driver.constructorId ? `<a href="#/constructor/${driver.constructorId}">${driver.team}</a>` : (driver ? driver.team : '-')}</td>
              <td class="grid-position">${result.grid || '—'}</td>
              <td class="status">${result.status || '—'}</td>
              <td class="points">${ptsDisplay}</td>
              ${hasDraft ? `<td class="owner">${ownerBadge}</td>` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

    return table;
  }
}
