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
    const message = this.createElement('div', 'empty-state');
    message.innerHTML = `
      <h2>Race Not Found</h2>
      <p>The race you're looking for doesn't exist.</p>
      <a href="#/calendar" class="btn-primary">Back to Calendar</a>
    `;
    this.root.appendChild(message);
  }

  renderHeader() {
    const header = this.createElement('div', 'race-detail-header');

    const backLink = this.createElement('a', 'back-link');
    backLink.href = '#/calendar';
    backLink.innerHTML = '← Back to Calendar';
    header.appendChild(backLink);

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
      qualifyingCard.appendChild(qualifyingTable);

      resultsSection.appendChild(qualifyingCard);
    }

    // Race Results
    const raceResults = dataStore.indexes.resultsByRace.get(this.raceId) || [];
    if (raceResults.length > 0) {
      const raceCard = this.createElement('div', 'results-card');
      const raceTitle = this.createElement('h2', 'results-title', 'Race Results');
      raceCard.appendChild(raceTitle);

      const raceTable = this.renderRaceResultsTable(raceResults);
      raceCard.appendChild(raceTable);

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
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Q1</th>
          <th>Q2</th>
          <th>Q3</th>
          ${hasDraft ? '<th>Owner</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${results.map(result => {
          const driver = dataStore.indexes.driverById.get(result.driverId);
          let ownerClass = '';
          let ownerText = '';

          if (hasDraft && driver) {
            if (playerDrivers.player1.includes(result.driverId)) {
              ownerClass = 'player1-owned';
              ownerText = draftStore.draft.players[0].name;
            } else if (playerDrivers.player2.includes(result.driverId)) {
              ownerClass = 'player2-owned';
              ownerText = draftStore.draft.players[1].name;
            }
          }

          return `
            <tr class="${ownerClass}">
              <td class="position">${result.position}</td>
              <td class="driver-name">
                <a href="#/driver/${result.driverId}">${driver ? driver.name : result.driverId}</a>
              </td>
              <td class="team-name">${driver ? driver.team : '-'}</td>
              <td class="time">${result.q1 || '-'}</td>
              <td class="time">${result.q2 || '-'}</td>
              <td class="time">${result.q3 || '-'}</td>
              ${hasDraft ? `<td class="owner">${ownerText}</td>` : ''}
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
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Grid</th>
          <th>Status</th>
          <th>Points</th>
          ${hasDraft ? '<th>Owner</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${results.map(result => {
          const driver = dataStore.indexes.driverById.get(result.driverId);
          let ownerClass = '';
          let ownerText = '';

          if (hasDraft && driver) {
            if (playerDrivers.player1.includes(result.driverId)) {
              ownerClass = 'player1-owned';
              ownerText = draftStore.draft.players[0].name;
            } else if (playerDrivers.player2.includes(result.driverId)) {
              ownerClass = 'player2-owned';
              ownerText = draftStore.draft.players[1].name;
            }
          }

          return `
            <tr class="${ownerClass}">
              <td class="position">${result.position}</td>
              <td class="driver-name">
                <a href="#/driver/${result.driverId}">${driver ? driver.name : result.driverId}</a>
              </td>
              <td class="team-name">${driver ? driver.team : '-'}</td>
              <td class="grid-position">${result.grid || '-'}</td>
              <td class="status">${result.status || '-'}</td>
              <td class="points">${result.points}</td>
              ${hasDraft ? `<td class="owner">${ownerText}</td>` : ''}
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

    return table;
  }
}
