// views/constructor-profile-view.js
// Constructor profile view showing team information and statistics

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class ConstructorProfileView extends BaseView {
  async render(container, params) {
    this.root = container;
    this.constructorId = params.constructorId;

    // Sync season from current season
    if (draftStore.currentSeason) {
      dataStore.setSeason(draftStore.currentSeason);
    }

    // Load data
    if (!dataStore.loaded) {
      await dataStore.load();
    }

    this.root.innerHTML = '';

    const constructor = dataStore.indexes.constructorById.get(this.constructorId);
    if (!constructor) {
      this.renderNotFound();
      return;
    }

    this.constructor = constructor;

    // Render components
    this.renderHeader();
    this.renderDrivers();
    this.renderSeasonStats();
    this.renderRankProgressionChart();
    this.renderPointsProgressionChart();
    this.renderRaceResults();
  }

  renderNotFound() {
    const empty = this.createEmptyState(
      `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="17" y1="11" x2="23" y2="11"/>
      </svg>`,
      'Constructor not found',
      'The team you\'re looking for doesn\'t exist or has no data for this season.'
    );
    const backBtn = document.createElement('a');
    backBtn.href = '#/constructors';
    backBtn.className = 'btn btn-outline';
    backBtn.style.marginTop = 'var(--spacing-md)';
    backBtn.textContent = 'View all constructors';
    empty.appendChild(backBtn);
    this.root.appendChild(empty);
  }

  renderHeader() {
    const header = this.createElement('div', 'constructor-profile-header');

    // Breadcrumb nav
    const breadcrumb = this.createBreadcrumb([
      { label: 'Constructors', href: '#/constructors' },
      { label: this.constructor.name }
    ]);
    header.appendChild(breadcrumb);

    const teamName = this.createElement('h1', 'constructor-name', this.constructor.name);
    if (this.constructor.teamColor) {
      teamName.style.color = this.constructor.teamColor;
    }
    header.appendChild(teamName);

    const nationality = this.createElement('div', 'constructor-nationality');
    nationality.textContent = this.constructor.nationality || '';
    header.appendChild(nationality);

    this.root.appendChild(header);
  }

  renderDrivers() {
    // Get drivers for this constructor
    const teamDrivers = dataStore.data.drivers.filter(d => {
      // Match by team name (constructor name might be slightly different)
      return d.team.toLowerCase().includes(this.constructor.name.toLowerCase()) ||
             this.constructor.name.toLowerCase().includes(d.team.toLowerCase());
    });

    if (teamDrivers.length === 0) {
      return;
    }

    const driversSection = this.createElement('section', 'drivers-comparison-section');
    const title = this.createElement('h2', 'section-title', 'Drivers');
    driversSection.appendChild(title);

    const driversGrid = this.createElement('div', 'drivers-comparison-grid');

    teamDrivers.forEach(driver => {
      const driverCard = this.createDriverDetailCard(driver);
      driversGrid.appendChild(driverCard);
    });

    driversSection.appendChild(driversGrid);
    this.root.appendChild(driversSection);
  }

  createDriverDetailCard(driver) {
    const card = this.createElement('div', 'driver-detail-card');

    // Driver header with photo
    const header = this.createElement('div', 'driver-detail-header');
    
    const photo = this.createElement('img', 'driver-detail-photo');
    photo.src = driver.photoUrl;
    photo.alt = ''; // decorative; driver name is already in the adjacent text
    photo.setAttribute('aria-hidden', 'true');
    photo.onerror = () => {
      photo.src = 'data:image/svg+xml,...'; // fallback
    };
    header.appendChild(photo);

    const headerInfo = this.createElement('div', 'driver-detail-header-info');
    
    const nameLink = this.createElement('a', 'driver-detail-name');
    nameLink.href = `#/driver/${driver.driverId}`;
    nameLink.textContent = driver.name;
    headerInfo.appendChild(nameLink);

    const driverNumber = this.createElement('div', 'driver-detail-number', `#${driver.number || '-'}`);
    headerInfo.appendChild(driverNumber);

    const driverCode = this.createElement('div', 'driver-detail-code', driver.code);
    headerInfo.appendChild(driverCode);

    header.appendChild(headerInfo);
    card.appendChild(header);

    // Check which player owns this driver
    if (draftStore.draft && draftStore.draft.players) {
      const owningPlayer = draftStore.draft.players.find(p => p.roster.includes(driver.driverId));
      if (owningPlayer) {
        const ownerBadge = this.createElement('div', ['driver-owner-badge', `player-${owningPlayer.playerId}`]);
        ownerBadge.textContent = `Drafted by: ${owningPlayer.name}`;
        card.appendChild(ownerBadge);
      }
    }

    // Season statistics
    const seasonSummary = dataStore.getDriverSeasonSummary(dataStore.season, driver.driverId);
    
    if (seasonSummary) {
      const statsContainer = this.createElement('div', 'driver-stats-container');

      // Calculate podiums and fastest laps from race results (convert strings to numbers)
      const raceResults = dataStore.data.raceResults.filter(r => 
        r.driverId === driver.driverId && r.season === dataStore.season
      );
      
      const podiums = raceResults.filter(r => parseInt(r.position) <= 3).length;
      const fastestLaps = raceResults.filter(r => parseInt(r.fastestLapRank) === 1).length;
      const dnfs = raceResults.filter(r => r.status && r.status !== 'Finished').length;

      // Get qualifying results for poles and Q1/Q2/Q3 stats
      const qualifyingResults = dataStore.data.qualifying.filter(q => 
        q.driverId === driver.driverId && q.season === dataStore.season
      );
      
      const poles = qualifyingResults.filter(q => parseInt(q.position) === 1).length;
      
      // Qualifying performance - Q1, Q2, Q3 eliminations
      const q1Outs = qualifyingResults.filter(q => !q.q2 && q.q1).length;
      const q2Outs = qualifyingResults.filter(q => !q.q3 && q.q2).length;
      const q3Apps = qualifyingResults.filter(q => q.q3).length;

      // Calculate race beats and quali beats vs teammates
      const teamDrivers = dataStore.data.drivers.filter(d => 
        d.driverId !== driver.driverId && 
        (d.team.toLowerCase().includes(this.constructor.name.toLowerCase()) ||
         this.constructor.name.toLowerCase().includes(d.team.toLowerCase()))
      );

      let raceBeats = 0;
      let qualiBeats = 0;
      let raceBattles = 0;
      let qualiBattles = 0;

      teamDrivers.forEach(teammate => {
        // Race beats - head-to-head race finishes
        raceResults.forEach(result => {
          const teammateResult = dataStore.data.raceResults.find(r => 
            r.raceId === result.raceId && 
            r.driverId === teammate.driverId &&
            r.season === dataStore.season
          );
          
          if (teammateResult) {
            const pos1 = parseInt(result.position);
            const pos2 = parseInt(teammateResult.position);
            
            if (!isNaN(pos1) && !isNaN(pos2)) {
              raceBattles++;
              if (pos1 < pos2) {
                raceBeats++;
              }
            }
          }
        });

        // Quali beats - head-to-head qualifying positions
        qualifyingResults.forEach(result => {
          const teammateResult = dataStore.data.qualifying.find(q => 
            q.raceId === result.raceId && 
            q.driverId === teammate.driverId &&
            q.season === dataStore.season
          );
          
          if (teammateResult) {
            const pos1 = parseInt(result.position);
            const pos2 = parseInt(teammateResult.position);
            
            if (!isNaN(pos1) && !isNaN(pos2)) {
              qualiBattles++;
              if (pos1 < pos2) {
                qualiBeats++;
              }
            }
          }
        });
      });

      // Calculate average positions and improvements
      const validQualiPositions = qualifyingResults
        .map(q => parseInt(q.position))
        .filter(p => !isNaN(p) && p > 0);
      
      const avgQualiPosition = validQualiPositions.length > 0
        ? (validQualiPositions.reduce((sum, p) => sum + p, 0) / validQualiPositions.length).toFixed(1)
        : '-';

      const validRacePositions = raceResults
        .map(r => parseInt(r.position))
        .filter(p => !isNaN(p) && p > 0);
      
      const avgRacePosition = validRacePositions.length > 0
        ? (validRacePositions.reduce((sum, p) => sum + p, 0) / validRacePositions.length).toFixed(1)
        : '-';

      // Calculate average position improvement (quali position - race position)
      // Positive means improved, negative means dropped positions
      let totalImprovement = 0;
      let improvementCount = 0;

      raceResults.forEach(race => {
        const qualiData = qualifyingResults.find(q => q.raceId === race.raceId);
        if (qualiData) {
          const qualiPos = parseInt(qualiData.position);
          const racePos = parseInt(race.position);
          
          if (!isNaN(qualiPos) && !isNaN(racePos) && qualiPos > 0 && racePos > 0) {
            totalImprovement += (qualiPos - racePos); // Positive = improved
            improvementCount++;
          }
        }
      });

      const avgImprovement = improvementCount > 0
        ? (totalImprovement / improvementCount).toFixed(1)
        : '-';
      
      const improvementDisplay = avgImprovement !== '-' 
        ? (parseFloat(avgImprovement) >= 0 ? `+${avgImprovement}` : avgImprovement)
        : '-';

      const stats = [
        { label: 'Position', value: `P${seasonSummary.position}`, icon: '🏆' },
        { label: 'Points', value: seasonSummary.points || 0, icon: '📊' },
        { label: 'Wins', value: seasonSummary.wins || 0, icon: '🥇' },
        { label: 'Podiums', value: podiums, icon: '🏁' },
        { label: 'Poles', value: poles, icon: '🎯' },
        { label: 'Fastest Laps', value: fastestLaps, icon: '🟣' },
        { label: 'Q3 Apps', value: q3Apps, icon: '🟢' },
        { label: 'Q2 Outs', value: q2Outs, icon: '🟡' },
        { label: 'Q1 Outs', value: q1Outs, icon: '🔴' },
        { label: 'Avg Quali Pos', value: avgQualiPosition, icon: '🏁' },
        { label: 'Avg Race Pos', value: avgRacePosition, icon: '🏎️' },
        { label: 'Avg Improvement', value: improvementDisplay, icon: '📈' },
        { label: 'Quali Beats', value: qualiBattles > 0 ? `${qualiBeats}/${qualiBattles}` : '-', icon: '🎯' },
        { label: 'Race Beats', value: raceBattles > 0 ? `${raceBeats}/${raceBattles}` : '-', icon: '🏎️' },
        { label: 'DNFs', value: dnfs, icon: '❌' }
      ];

      const statsGrid = this.createElement('div', 'driver-stats-grid');

      stats.forEach(stat => {
        const statItem = this.createElement('div', 'driver-stat-item');
        
        // Build tooltip with race details
        let tooltipText = '';
        
        if (stat.label === 'Wins' && stat.value > 0) {
          const wins = raceResults.filter(r => parseInt(r.position) === 1);
          const raceNames = wins.map(r => {
            const race = dataStore.indexes.raceById.get(r.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `Won at:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'DNFs' && stat.value > 0) {
          const dnfResults = raceResults.filter(r => r.status && r.status !== 'Finished');
          const raceNames = dnfResults.map(r => {
            const race = dataStore.indexes.raceById.get(r.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `DNFs at:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'Podiums' && stat.value > 0) {
          const podiumResults = raceResults.filter(r => {
            const pos = parseInt(r.position);
            return pos >= 1 && pos <= 3;
          });
          const raceNames = podiumResults.map(r => {
            const race = dataStore.indexes.raceById.get(r.raceId);
            return race ? `${race.raceName} (P${r.position})` : 'Race';
          });
          tooltipText = `Podiums:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'Poles' && stat.value > 0) {
          const poleResults = qualifyingResults.filter(q => parseInt(q.position) === 1);
          const raceNames = poleResults.map(q => {
            const race = dataStore.indexes.raceById.get(q.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `Poles at:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'Fastest Laps' && stat.value > 0) {
          const flResults = raceResults.filter(r => parseInt(r.fastestLapRank) === 1);
          const raceNames = flResults.map(r => {
            const race = dataStore.indexes.raceById.get(r.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `Fastest Laps at:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'Q3 Apps' && stat.value > 0) {
          const q3Results = qualifyingResults.filter(q => q.q3);
          const raceNames = q3Results.map(q => {
            const race = dataStore.indexes.raceById.get(q.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `Q3 appearances at:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'Q2 Outs' && stat.value > 0) {
          const q2OutResults = qualifyingResults.filter(q => !q.q3 && q.q2);
          const raceNames = q2OutResults.map(q => {
            const race = dataStore.indexes.raceById.get(q.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `Q2 eliminations at:\n${raceNames.join('\n')}`;
        } else if (stat.label === 'Q1 Outs' && stat.value > 0) {
          const q1OutResults = qualifyingResults.filter(q => !q.q2 && q.q1);
          const raceNames = q1OutResults.map(q => {
            const race = dataStore.indexes.raceById.get(q.raceId);
            return race ? race.raceName : 'Race';
          });
          tooltipText = `Q1 eliminations at:\n${raceNames.join('\n')}`;
        }
        
        statItem.innerHTML = `
          <div class="stat-value">${stat.icon} ${stat.value}</div>
          <div class="stat-label">${stat.label}</div>
        `;
        if (tooltipText) {
          const tooltipEl = this.createElement('div', 'stat-tooltip');
          tooltipEl.textContent = tooltipText;
          statItem.appendChild(tooltipEl);
          statItem.addEventListener('mouseenter', (e) => this.showTooltip(e, tooltipEl));
          statItem.addEventListener('mouseleave', () => this.hideTooltip(tooltipEl));
        }
        statsGrid.appendChild(statItem);
      });

      card.appendChild(statsGrid);
    } else {
      const noStats = this.createElement('p', 'no-stats', 'No season data available');
      card.appendChild(noStats);
    }

    return card;
  }

  renderSeasonStats() {
    const seasonSummary = dataStore.data.constructorSeasonSummary.find(
      c => c.constructorId === this.constructorId
    );

    if (!seasonSummary) {
      return;
    }

    // Get all drivers for this constructor
    const teamDriverIds = dataStore.data.drivers
      .filter(d => d.team.toLowerCase().includes(this.constructor.name.toLowerCase()) ||
                   this.constructor.name.toLowerCase().includes(d.team.toLowerCase()))
      .map(d => d.driverId);

    // Calculate additional stats from race results
    const teamRaceResults = dataStore.data.raceResults.filter(r =>
      teamDriverIds.includes(r.driverId) && r.season === dataStore.season
    );

    // DNFs
    const dnfs = teamRaceResults.filter(r => 
      r.status && !r.status.includes('Finished') && !r.status.includes('+') && r.status !== 'Unknown'
    ).length;

    // Fastest Laps (convert string to number)
    const fastestLaps = teamRaceResults.filter(r => parseInt(r.fastestLapRank) === 1).length;

    // Poles from qualifying
    const teamQualifyingResults = dataStore.data.qualifying.filter(q =>
      teamDriverIds.includes(q.driverId) && q.season === dataStore.season
    );
    const poles = teamQualifyingResults.filter(q => parseInt(q.position) === 1).length;

    // Podiums (convert string to number)
    const podiums = teamRaceResults.filter(r => {
      const pos = parseInt(r.position);
      return pos >= 1 && pos <= 3;
    }).length;

    // Qualifying performance - Q1, Q2, Q3 eliminations
    const q1Outs = teamQualifyingResults.filter(q => !q.q2 && q.q1).length; // Has Q1 time but no Q2
    const q2Outs = teamQualifyingResults.filter(q => !q.q3 && q.q2).length; // Has Q2 time but no Q3
    const q3Appearances = teamQualifyingResults.filter(q => q.q3).length; // Has Q3 time

    const statsCard = this.createElement('div', 'stats-card');
    const title = this.createElement('h2', 'stats-title', `${dataStore.season} Season Statistics`);
    statsCard.appendChild(title);

    const statsGrid = this.createElement('div', 'stats-grid');

    const stats = [
      { label: 'Position', value: `P${seasonSummary.position || '-'}`, icon: '🏆' },
      { label: 'Points', value: seasonSummary.points || 0, icon: '📊' },
      { label: 'Wins', value: seasonSummary.wins || 0, icon: '🥇' },
      { label: 'Podiums', value: podiums, icon: '🏁' },
      { label: 'Poles', value: poles, icon: '🎯' },
      { label: 'Fastest Laps', value: fastestLaps, icon: '🟣' },
      { label: 'Q3 Apps', value: q3Appearances, icon: '🟢' },
      { label: 'Q2 Outs', value: q2Outs, icon: '🟡' },
      { label: 'Q1 Outs', value: q1Outs, icon: '🔴' },
      { label: 'DNFs', value: dnfs, icon: '❌' }
    ];

    stats.forEach(stat => {
      const statItem = this.createElement('div', 'stat-item');
      statItem.innerHTML = `
        <div class="stat-value">${stat.icon} ${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
      `;
      statsGrid.appendChild(statItem);
    });

    statsCard.appendChild(statsGrid);
    this.root.appendChild(statsCard);
  }

  showTooltip(event, tooltipEl) {
    tooltipEl.style.display = 'block';
    tooltipEl.style.opacity = '1';
  }

  hideTooltip(tooltipEl) {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.display = 'none';
  }

  renderRaceResults() {
    // Get all results for drivers of this team
    const teamDriverIds = dataStore.data.drivers
      .filter(d => d.team.toLowerCase().includes(this.constructor.name.toLowerCase()) ||
                   this.constructor.name.toLowerCase().includes(d.team.toLowerCase()))
      .map(d => d.driverId);

    const teamResults = dataStore.data.raceResults.filter(r =>
      teamDriverIds.includes(r.driverId)
    );

    if (teamResults.length === 0) {
      return;
    }

    // Group by race
    const resultsByRace = new Map();
    teamResults.forEach(result => {
      if (!resultsByRace.has(result.raceId)) {
        resultsByRace.set(result.raceId, []);
      }
      resultsByRace.get(result.raceId).push(result);
    });

    const historyCard = this.createElement('div', 'race-history-card');
    const title = this.createElement('h2', 'stats-title', 'Race Results');
    historyCard.appendChild(title);

    const table = this.createElement('table', 'results-table');

    const rows = Array.from(resultsByRace.entries()).map(([raceId, results]) => {
      const race = dataStore.indexes.raceById.get(raceId);
      const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0);

      return `
        <tr>
          <td>${race ? race.round : '-'}</td>
          <td class="race-name">
            <a href="#/race/${raceId}">${race ? race.raceName : raceId}</a>
          </td>
          <td>${results.map(r => {
            const driver = dataStore.indexes.driverById.get(r.driverId);
            return `${driver ? driver.code : r.driverId} (P${r.position})`;
          }).join(', ')}</td>
          <td class="points">${totalPoints}</td>
        </tr>
      `;
    }).join('');

    table.innerHTML = `
      <thead>
        <tr>
          <th>Round</th>
          <th>Race</th>
          <th>Results</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    `;

    const tableWrapper = this.createElement('div', 'table-responsive');
    tableWrapper.appendChild(table);
    historyCard.appendChild(tableWrapper);
    this.root.appendChild(historyCard);
  }

  renderRankProgressionChart() {
    // Calculate constructor rank progression across the season for all constructors
    const raceResults = dataStore.data.raceResults.filter(r => 
      r.season === dataStore.season
    );

    if (raceResults.length === 0) return;

    // Group by round and calculate cumulative points and ranks for all constructors
    const rounds = [...new Set(raceResults.map(r => r.round))].sort((a, b) => a - b);
    const constructorCumulativePoints = new Map();
    const allConstructorRankData = new Map();

    const sprintResultsBySeason = dataStore.data.sprintResults.filter(r =>
      r.season === dataStore.season
    );

    rounds.forEach(round => {
      const roundResults = raceResults.filter(r => r.round === round);
      const roundSprintResults = sprintResultsBySeason.filter(r => r.round === round);
      
      // Update cumulative points for all constructors (race + sprint)
      [...roundResults, ...roundSprintResults].forEach(result => {
        // Find constructor for this driver
        const driver = dataStore.data.drivers.find(d => d.driverId === result.driverId);
        if (!driver) return;
        
        const constructor = dataStore.data.constructors.find(c =>
          driver.team.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(driver.team.toLowerCase())
        );
        
        if (!constructor) return;
        
        const currentPoints = constructorCumulativePoints.get(constructor.constructorId) || 0;
        constructorCumulativePoints.set(constructor.constructorId, currentPoints + (parseFloat(result.points) || 0));
      });

      // Calculate ranks based on cumulative points
      const sortedConstructors = Array.from(constructorCumulativePoints.entries())
        .sort((a, b) => b[1] - a[1]); // Sort by points descending

      // Get race name
      const race = dataStore.data.races.find(r => r.round === round && r.season === dataStore.season);
      const raceName = race && race.name ? race.name.replace(' Grand Prix', '') : `Round ${round}`;

      // Store rank for each constructor
      sortedConstructors.forEach(([constructorId, points], index) => {
        if (!allConstructorRankData.has(constructorId)) {
          allConstructorRankData.set(constructorId, []);
        }
        allConstructorRankData.get(constructorId).push({
          round,
          raceName,
          rank: index + 1
        });
      });
    });

    if (allConstructorRankData.size === 0) return;

    const chartSection = this.createElement('section', 'rank-progression');
    const heading = this.createElement('h2', 'stats-title', 'Championship Position Progression');
    chartSection.appendChild(heading);

    const canvasContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'constructorRankChart';
    canvasContainer.appendChild(canvas);
    chartSection.appendChild(canvasContainer);

    this.root.appendChild(chartSection);

    // Render chart after DOM insertion
    setTimeout(() => {
      if (typeof Chart === 'undefined') {
        console.error('[ConstructorProfileView] Chart.js not loaded');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[ConstructorProfileView] Could not get canvas context');
        return;
      }

      // Create datasets for all constructors
      const datasets = [];
      const raceLabels = allConstructorRankData.get(this.constructorId)?.[0]?.raceName ? 
        allConstructorRankData.get(this.constructorId).map(d => d.raceName) : 
        [...allConstructorRankData.values()][0].map(d => d.raceName);

      allConstructorRankData.forEach((rankData, constructorId) => {
        const constructor = dataStore.data.constructors.find(c => c.constructorId === constructorId);
        const isCurrentConstructor = constructorId === this.constructorId;
        
        datasets.push({
          label: constructor ? constructor.name : constructorId,
          data: rankData.map(d => d.rank),
          borderColor: isCurrentConstructor ? (this.constructor.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.3)',
          backgroundColor: isCurrentConstructor ? ((this.constructor.teamColor || '#E10600') + '33') : 'rgba(160, 160, 160, 0.1)',
          borderWidth: isCurrentConstructor ? 4 : 1.5,
          pointRadius: isCurrentConstructor ? 6 : 2,
          pointHoverRadius: isCurrentConstructor ? 8 : 4,
          pointBackgroundColor: isCurrentConstructor ? (this.constructor.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.5)',
          pointBorderColor: isCurrentConstructor ? '#1C2127' : 'rgba(160, 160, 160, 0.3)',
          pointBorderWidth: isCurrentConstructor ? 2 : 1,
          tension: 0.3,
          fill: false,
          order: isCurrentConstructor ? 1 : 2
        });
      });
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: raceLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2.5,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#E0E0E0',
                font: {
                  size: 10
                },
                boxWidth: 15,
                boxHeight: 2,
                filter: function(item, chart) {
                  // Show only the current constructor in legend
                  return item.text === (dataStore.data.constructors.find(c => c.constructorId === this.constructorId)?.name || '');
                }.bind(this)
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(28, 33, 39, 0.95)',
              titleColor: '#E0E0E0',
              bodyColor: '#E0E0E0',
              borderColor: '#30363D',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': P' + context.parsed.y;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false,
                color: 'rgba(48, 54, 61, 0.3)'
              },
              ticks: {
                color: '#A0A0A0',
                font: {
                  size: 11
                },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              reverse: true,
              min: 1,
              grid: {
                color: 'rgba(48, 54, 61, 0.3)'
              },
              ticks: {
                stepSize: 1,
                color: '#A0A0A0',
                font: {
                  size: 12
                },
                callback: function(value) {
                  return 'P' + value;
                }
              },
              title: {
                display: true,
                text: 'Championship Position',
                color: '#E0E0E0',
                font: {
                  size: 13,
                  weight: 'bold'
                }
              }
            }
          }
        }
      });
    }, 100);
  }

  renderPointsProgressionChart() {
    // Calculate cumulative points progression for all constructors
    const raceResults = dataStore.data.raceResults.filter(r => 
      r.season === dataStore.season
    ).sort((a, b) => a.round - b.round);

    if (raceResults.length === 0) return;

    // Group by round and calculate cumulative points for all constructors
    const rounds = [...new Set(raceResults.map(r => r.round))].sort((a, b) => a - b);
    const allConstructorPointsData = new Map();
    const constructorCumulativePoints = new Map();

    const sprintResultsBySeasonForPoints = dataStore.data.sprintResults.filter(r =>
      r.season === dataStore.season
    );

    rounds.forEach(round => {
      const roundResults = raceResults.filter(r => r.round === round);
      const roundSprintResults = sprintResultsBySeasonForPoints.filter(r => r.round === round);
      
      // Update cumulative points for all constructors (race + sprint)
      [...roundResults, ...roundSprintResults].forEach(result => {
        // Find constructor for this driver
        const driver = dataStore.data.drivers.find(d => d.driverId === result.driverId);
        if (!driver) return;
        
        const constructor = dataStore.data.constructors.find(c =>
          driver.team.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(driver.team.toLowerCase())
        );
        
        if (!constructor) return;
        
        const currentPoints = constructorCumulativePoints.get(constructor.constructorId) || 0;
        const newPoints = currentPoints + (parseFloat(result.points) || 0);
        constructorCumulativePoints.set(constructor.constructorId, newPoints);
      });
      
      // Get race name
      const race = dataStore.data.races.find(r => r.round === round && r.season === dataStore.season);
      const raceName = race && race.name ? race.name.replace(' Grand Prix', '') : `Round ${round}`;
      
      // Store points for each constructor at this round
      constructorCumulativePoints.forEach((points, constructorId) => {
        if (!allConstructorPointsData.has(constructorId)) {
          allConstructorPointsData.set(constructorId, []);
        }
        allConstructorPointsData.get(constructorId).push({
          round,
          raceName,
          points: points
        });
      });
    });

    if (allConstructorPointsData.size === 0) return;

    const chartSection = this.createElement('section', 'points-progression');
    const heading = this.createElement('h2', 'stats-title', 'Cumulative Points Progression');
    chartSection.appendChild(heading);

    const canvasContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'constructorPointsChart';
    canvasContainer.appendChild(canvas);
    chartSection.appendChild(canvasContainer);

    this.root.appendChild(chartSection);

    // Render chart after DOM insertion
    setTimeout(() => {
      if (typeof Chart === 'undefined') {
        console.error('[ConstructorProfileView] Chart.js not loaded');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[ConstructorProfileView] Could not get canvas context');
        return;
      }

      // Create datasets for all constructors
      const datasets = [];
      const raceLabels = allConstructorPointsData.get(this.constructorId)?.[0]?.raceName ? 
        allConstructorPointsData.get(this.constructorId).map(d => d.raceName) : 
        [...allConstructorPointsData.values()][0].map(d => d.raceName);

      allConstructorPointsData.forEach((pointsData, constructorId) => {
        const constructor = dataStore.data.constructors.find(c => c.constructorId === constructorId);
        const isCurrentConstructor = constructorId === this.constructorId;
        
        datasets.push({
          label: constructor ? constructor.name : constructorId,
          data: pointsData.map(d => d.points),
          borderColor: isCurrentConstructor ? (this.constructor.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.3)',
          backgroundColor: isCurrentConstructor ? ((this.constructor.teamColor || '#E10600') + '33') : 'rgba(160, 160, 160, 0.1)',
          borderWidth: isCurrentConstructor ? 4 : 1.5,
          pointRadius: isCurrentConstructor ? 6 : 2,
          pointHoverRadius: isCurrentConstructor ? 8 : 4,
          pointBackgroundColor: isCurrentConstructor ? (this.constructor.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.5)',
          pointBorderColor: isCurrentConstructor ? '#1C2127' : 'rgba(160, 160, 160, 0.3)',
          pointBorderWidth: isCurrentConstructor ? 2 : 1,
          tension: 0.3,
          fill: isCurrentConstructor,
          order: isCurrentConstructor ? 1 : 2
        });
      });
      
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: raceLabels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2.5,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#E0E0E0',
                font: {
                  size: 10
                },
                boxWidth: 15,
                boxHeight: 2,
                filter: function(item, chart) {
                  // Show only the current constructor in legend
                  return item.text === (dataStore.data.constructors.find(c => c.constructorId === this.constructorId)?.name || '');
                }.bind(this)
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(28, 33, 39, 0.95)',
              titleColor: '#E0E0E0',
              bodyColor: '#E0E0E0',
              borderColor: '#30363D',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ' + context.parsed.y + ' pts';
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false,
                color: 'rgba(48, 54, 61, 0.3)'
              },
              ticks: {
                color: '#A0A0A0',
                font: {
                  size: 11
                },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              type: 'logarithmic',
              min: 1,
              grid: {
                color: 'rgba(48, 54, 61, 0.3)'
              },
              ticks: {
                color: '#A0A0A0',
                font: {
                  size: 12
                },
                callback: function(value) {
                  if (value === 1 || value === 10 || value === 100 || value === 1000) {
                    return value;
                  }
                  return '';
                }
              },
              title: {
                display: true,
                text: 'Cumulative Points (Log Scale)',
                color: '#E0E0E0',
                font: {
                  size: 13,
                  weight: 'bold'
                }
              }
            }
          }
        }
      });
    }, 100);
  }
}
