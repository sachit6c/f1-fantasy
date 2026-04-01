// views/constructors-list-view.js
// List view showing all constructors/teams

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class ConstructorsListView extends BaseView {
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

    // Constructors grid
    this.renderConstructorsGrid();
  }

  renderHeader() {
    const header = this.createElement('div', 'constructors-header');

    const title = this.createElement('h1', 'page-title', 'Constructors');
    header.appendChild(title);

    const subtitle = this.createElement('p', 'page-subtitle', `${dataStore.season} F1 Teams`);
    header.appendChild(subtitle);

    this.root.appendChild(header);
  }

  renderConstructorsGrid() {
    const constructors = dataStore.data.constructors;

    if (constructors.length === 0) {
      const emptyMessage = this.createElement('div', 'empty-state');
      emptyMessage.innerHTML = '<p>No constructor data available</p>';
      this.root.appendChild(emptyMessage);
      return;
    }

    // Sort constructors by standings if available
    const sortedConstructors = [...constructors].sort((a, b) => {
      const summaryA = dataStore.data.constructorSeasonSummary.find(s => s.constructorId === a.constructorId);
      const summaryB = dataStore.data.constructorSeasonSummary.find(s => s.constructorId === b.constructorId);

      if (summaryA && summaryB) {
        return summaryA.position - summaryB.position;
      }
      if (summaryA) return -1;
      if (summaryB) return 1;
      return a.name.localeCompare(b.name);
    });

    const constructorsGrid = this.createElement('div', 'constructors-grid');

    sortedConstructors.forEach(constructor => {
      const constructorCard = this.createElement('div', 'constructor-card');
      constructorCard.style.cursor = 'pointer';
      constructorCard.addEventListener('click', () => {
        window.location.hash = `#/constructor/${constructor.constructorId}`;
      });

      // Team color header with logo
      const colorHeader = this.createElement('div', 'constructor-color-header');
      colorHeader.style.background = `linear-gradient(135deg, ${constructor.teamColor} 0%, ${constructor.teamColor}DD 100%)`;

      // Add team logo image with fallback support
      if (constructor.logoUrl) {
        const logoUrls = dataStore.getConstructorLogoWithFallback(constructor.constructorId);
        const logoImg = document.createElement('img');
        logoImg.src = logoUrls.primary;
        logoImg.alt = constructor.name;
        logoImg.className = 'constructor-logo-img';
        
        // Fallback chain for different image formats
        logoImg.onerror = () => {
          if (logoImg.src.includes('.png')) {
            logoImg.src = logoUrls.fallback1;
          } else if (logoImg.src.includes('.jpg')) {
            logoImg.src = logoUrls.fallback2;
          }
        };
        
        colorHeader.appendChild(logoImg);
      } else {
        const logo = this.createElement('div', 'constructor-logo');
        const initials = constructor.name.split(' ').map(word => word[0]).join('').substring(0, 3);
        logo.textContent = initials;
        logo.style.color = 'white';
        colorHeader.appendChild(logo);
      }

      constructorCard.appendChild(colorHeader);

      // Constructor info
      const infoSection = this.createElement('div', 'constructor-info-section');

      // Constructor name
      const name = this.createElement('h2', 'constructor-name', constructor.name);
      infoSection.appendChild(name);

      // Nationality
      const nationality = this.createElement('div', 'constructor-nationality');
      nationality.innerHTML = `🏁 ${constructor.nationality}`;
      infoSection.appendChild(nationality);

      // Get drivers for this team
      const teamDrivers = dataStore.data.drivers.filter(d => d.team === constructor.name);
      if (teamDrivers.length > 0) {
        const driversSection = this.createElement('div', 'constructor-drivers');
        const driversLabel = this.createElement('div', 'drivers-label', 'Drivers:');
        driversSection.appendChild(driversLabel);

        teamDrivers.forEach(driver => {
          const driverLink = this.createElement('a', 'driver-link');
          driverLink.href = `#/driver/${driver.driverId}`;
          driverLink.textContent = driver.name;
          driverLink.addEventListener('click', (e) => {
            e.stopPropagation();
          });
          driversSection.appendChild(driverLink);
        });

        infoSection.appendChild(driversSection);
      }

      // Season stats
      const summary = dataStore.data.constructorSeasonSummary.find(s => s.constructorId === constructor.constructorId);
      if (summary) {
        try {
          // Calculate additional stats from race and qualifying results
          const teamDriverIds = teamDrivers.map(d => d.driverId);
          const raceResults = dataStore.data.raceResults.filter(r => 
            teamDriverIds.includes(r.driverId) && r.season === dataStore.season
          );
          const qualifyingResults = dataStore.data.qualifying.filter(q => 
            teamDriverIds.includes(q.driverId) && q.season === dataStore.season
          );

          // Calculate stats (convert string positions to numbers)
          const podiums = raceResults.filter(r => parseInt(r.position) <= 3).length;
          const dnfs = raceResults.filter(r => r.status && r.status !== 'Finished').length;
          const poles = qualifyingResults.filter(q => parseInt(q.position) === 1).length;
          const fastestLaps = raceResults.filter(r => parseInt(r.fastestLapRank) === 1).length;

          const statsGrid = this.createElement('div', 'constructor-stats-grid');

          const stats = [
            { label: 'Pos', value: summary.position, icon: '🏆' },
            { label: 'Pts', value: summary.points, icon: '📊' },
            { label: 'Wins', value: summary.wins, icon: '🥇' },
            { label: 'Podiums', value: podiums, icon: '🏁' },
            { label: 'Poles', value: poles, icon: '🎯' },
            { label: 'Fast', value: fastestLaps, icon: '🟣' },
            { label: 'DNFs', value: dnfs, icon: '❌' }
          ];

          stats.forEach(stat => {
            const statEl = this.createElement('div', 'constructor-stat');
            const value = this.createElement('div', 'stat-value');
            value.innerHTML = `<span class="stat-icon">${stat.icon}</span>${stat.value}`;
            const label = this.createElement('div', 'stat-label', stat.label);
            statEl.appendChild(value);
            statEl.appendChild(label);
            statsGrid.appendChild(statEl);
          });

          infoSection.appendChild(statsGrid);
        } catch (error) {
          console.error('Error rendering constructor stats:', error);
          // Show basic stats as fallback
          const statsGrid = this.createElement('div', 'constructor-stats-grid');
          const basicStats = [
            { label: 'Position', value: summary.position },
            { label: 'Points', value: summary.points },
            { label: 'Wins', value: summary.wins }
          ];
          basicStats.forEach(stat => {
            const statEl = this.createElement('div', 'constructor-stat');
            const value = this.createElement('div', 'stat-value', stat.value.toString());
            const label = this.createElement('div', 'stat-label', stat.label);
            statEl.appendChild(value);
            statEl.appendChild(label);
            statsGrid.appendChild(statEl);
          });
          infoSection.appendChild(statsGrid);
        }
      }

      // Add winning player badge if draft exists
      if (draftStore.draft && draftStore.draft.players && teamDrivers.length >= 2) {
        try {
          // Find all drafted drivers from this team and their owners
          const draftedDrivers = [];
          
          teamDrivers.forEach(driver => {
            const owner = draftStore.draft.players.find(p => p.roster.includes(driver.driverId));
            if (owner) {
              const summary = dataStore.getDriverSeasonSummary(dataStore.season, driver.driverId);
              if (summary) {
                draftedDrivers.push({
                  driver,
                  owner,
                  points: summary.points || 0
                });
              }
            }
          });

          // Only show badge if at least 2 drivers are drafted by different players
          if (draftedDrivers.length >= 2) {
            const uniquePlayers = [...new Set(draftedDrivers.map(d => d.owner.playerId))];
            
            if (uniquePlayers.length >= 2) {
              // Find the driver with the most points
              draftedDrivers.sort((a, b) => b.points - a.points);
              const winner = draftedDrivers[0];
              
              // Only show if there's a clear winner (not tied)
              if (winner.points > (draftedDrivers[1]?.points || 0)) {
                const winnerBadge = this.createElement('div', ['team-winner-badge', `player-${winner.owner.playerId}`]);
                winnerBadge.innerHTML = `
                  <div class="winner-text">${winner.owner.name} (${winner.driver.name})</div>
                `;
                infoSection.appendChild(winnerBadge);
              }
            }
          }
        } catch (error) {
          console.error('Error rendering team winner badge:', error);
        }
      }

      constructorCard.appendChild(infoSection);
      constructorsGrid.appendChild(constructorCard);
    });

    this.root.appendChild(constructorsGrid);
  }
}
