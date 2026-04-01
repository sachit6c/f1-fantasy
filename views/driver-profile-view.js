// views/driver-profile-view.js
// Driver profile view showing career and season statistics

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class DriverProfileView extends BaseView {
  async render(container, params) {
    this.root = container;
    this.driverId = params.driverId;

    // Sync season from current season
    if (draftStore.currentSeason) {
      dataStore.setSeason(draftStore.currentSeason);
    }

    // Load data
    if (!dataStore.loaded) {
      await dataStore.load();
    }

    this.root.innerHTML = '';

    const driver = dataStore.indexes.driverById.get(this.driverId);
    if (!driver) {
      this.renderNotFound();
      return;
    }

    this.driver = driver;

    // Render components
    this.renderHeader();
    this.renderDriverInfo();
    this.renderSeasonStats();
    this.renderRankProgressionChart();
    this.renderPointsProgressionChart();
    this.renderCareerStats();
    this.renderRaceHistory();
  }

  renderNotFound() {
    const empty = this.createEmptyState(
      `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        <line x1="17" y1="11" x2="23" y2="11"/>
      </svg>`,
      'Driver not found',
      'The driver you\'re looking for doesn\'t exist or has no data for this season.'
    );
    const backBtn = document.createElement('a');
    backBtn.href = '#/drivers';
    backBtn.className = 'btn btn-outline';
    backBtn.style.marginTop = 'var(--spacing-md)';
    backBtn.textContent = 'View all drivers';
    empty.appendChild(backBtn);
    this.root.appendChild(empty);
  }

  renderHeader() {
    const header = this.createElement('div', 'driver-profile-header');

    // Breadcrumb nav
    const breadcrumb = this.createBreadcrumb([
      { label: 'Drivers', href: '#/drivers' },
      { label: this.driver.name }
    ]);
    header.appendChild(breadcrumb);

    // Find constructor for team logo and link
    const constructor = dataStore.data.constructors.find(c => 
      c.name.toLowerCase().includes(this.driver.team.toLowerCase()) ||
      this.driver.team.toLowerCase().includes(c.name.toLowerCase())
    );

    const profileTop = this.createElement('div', 'profile-top');

    // Driver photo
    const photoContainer = this.createElement('div', 'driver-photo-large-container');
    const photo = this.createElement('img', 'driver-photo-large');
    photo.src = this.driver.photoUrl;
    photo.alt = this.driver.name;
    // Don't hide on error - SVG data URIs are locally generated
    photoContainer.appendChild(photo);
    profileTop.appendChild(photoContainer);

    // Driver details
    const detailsContainer = this.createElement('div', 'driver-details-container');

    const driverCode = this.createElement('div', 'driver-code-large-profile', this.driver.code);
    detailsContainer.appendChild(driverCode);

    const driverName = this.createElement('h1', 'driver-name-large', this.driver.name);
    detailsContainer.appendChild(driverName);

    const teamBadge = this.createElement('div', 'team-badge-container');
    
    // Team logo
    if (constructor) {
      const teamLogoLink = this.createElement('a', 'team-logo-inline');
      teamLogoLink.href = `#/constructor/${constructor.constructorId}`;
      teamLogoLink.title = this.driver.team;
      
      const logoUrls = dataStore.getConstructorLogoWithFallback(constructor.constructorId);
      const teamLogo = this.createElement('img', 'team-logo-inline-img');
      teamLogo.src = logoUrls.primary;
      teamLogo.alt = this.driver.team;
      
      // Fallback chain for different image formats
      teamLogo.onerror = () => {
        if (teamLogo.src.includes('.png')) {
          teamLogo.src = logoUrls.fallback1;
        } else if (teamLogo.src.includes('.jpg')) {
          teamLogo.src = logoUrls.fallback2;
        }
      };
      
      teamLogoLink.appendChild(teamLogo);
      teamBadge.appendChild(teamLogoLink);
    }
    
    // Team name badge
    const teamNameBadge = this.createElement('a', 'team-name-badge');
    teamNameBadge.textContent = this.driver.team;
    if (this.driver.teamColor) {
      teamNameBadge.style.backgroundColor = this.driver.teamColor;
      teamNameBadge.style.color = 'white';
    }
    if (constructor) {
      teamNameBadge.href = `#/constructor/${constructor.constructorId}`;
      teamNameBadge.style.cursor = 'pointer';
      teamNameBadge.style.textDecoration = 'none';
    }
    teamBadge.appendChild(teamNameBadge);
    detailsContainer.appendChild(teamBadge);

    profileTop.appendChild(detailsContainer);

    header.appendChild(profileTop);
    this.root.appendChild(header);
  }

  renderDriverInfo() {
    const infoCard = this.createElement('div', 'driver-info-card');

    const infoGrid = this.createElement('div', 'info-grid');

    // Basic info items
    const infoItems = [
      { label: 'Number', value: this.driver.number || '-' },
      { label: 'Nationality', value: this.driver.nationality || '-' }
    ];

    infoItems.forEach(item => {
      const infoItem = this.createElement('div', 'info-item');
      infoItem.innerHTML = `
        <span class="info-label">${item.label}</span>
        <span class="info-value">${item.value}</span>
      `;
      infoGrid.appendChild(infoItem);
    });

    // Add Team as clickable link
    const teamInfoItem = this.createElement('div', 'info-item');
    const teamLabel = this.createElement('span', 'info-label', 'Team');
    teamInfoItem.appendChild(teamLabel);
    
    const teamValue = this.createElement('span', 'info-value');
    const constructor = dataStore.data.constructors.find(c => 
      c.name.toLowerCase().includes(this.driver.team.toLowerCase()) ||
      this.driver.team.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (constructor) {
      const teamLink = this.createElement('a', 'team-link');
      teamLink.href = `#/constructor/${constructor.constructorId}`;
      teamLink.textContent = this.driver.team;
      teamLink.style.color = this.driver.teamColor || 'var(--color-primary)';
      teamLink.style.textDecoration = 'none';
      teamValue.appendChild(teamLink);
    } else {
      teamValue.textContent = this.driver.team;
    }
    teamInfoItem.appendChild(teamValue);
    infoGrid.appendChild(teamInfoItem);

    infoCard.appendChild(infoGrid);
    this.root.appendChild(infoCard);
  }

  renderSeasonStats() {
    const seasonSummary = dataStore.getDriverSeasonSummary(dataStore.season, this.driverId);

    if (!seasonSummary) {
      return;
    }

    const statsCard = this.createElement('div', 'stats-card');
    const title = this.createElement('h2', 'stats-title', `${dataStore.season} Season Statistics`);
    statsCard.appendChild(title);

    const statsGrid = this.createElement('div', 'stats-grid');

    // Calculate additional stats from race results
    const raceResults = dataStore.data.raceResults.filter(r => 
      r.driverId === this.driverId && r.season === dataStore.season
    );
    
    const dnfs = raceResults.filter(r => 
      !r.position || r.position === 0 || 
      (r.status && !r.status.toLowerCase().includes('finished'))
    ).length;
    
    // Get qualifying results for this driver
    const qualifyingResults = dataStore.data.qualifying.filter(q => 
      q.driverId === this.driverId && q.season === dataStore.season
    );
    
    // Count actual poles from qualifying data (convert string to number)
    const poles = qualifyingResults.filter(q => parseInt(q.position) === 1).length;
    
    // Calculate podiums and fastest laps from race results
    const podiums = raceResults.filter(r => parseInt(r.position) <= 3).length;
    const fastestLaps = raceResults.filter(r => parseInt(r.fastestLapRank) === 1).length;
    
    // Qualifying performance - Q1, Q2, Q3 eliminations
    const q1Outs = qualifyingResults.filter(q => !q.q2 && q.q1).length; // Has Q1 time but no Q2
    const q2Outs = qualifyingResults.filter(q => !q.q3 && q.q2).length; // Has Q2 time but no Q3
    const q3Appearances = qualifyingResults.filter(q => q.q3).length; // Has Q3 time

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
      { label: 'Points', value: seasonSummary.points || 0, icon: '📊' },
      { label: 'Position', value: `P${seasonSummary.position || '-'}`, icon: '🏆' },
      { label: 'Wins', value: seasonSummary.wins || 0, icon: '🥇' },
      { label: 'Podiums', value: podiums, icon: '🏁' },
      { label: 'Poles', value: poles, icon: '🎯' },
      { label: 'Fastest Laps', value: fastestLaps, icon: '🟣' },
      { label: 'DNFs', value: dnfs, icon: '❌' },
      { label: 'Q3 Apps', value: q3Appearances, icon: '🟢' },
      { label: 'Q2 Outs', value: q2Outs, icon: '🟡' },
      { label: 'Q1 Outs', value: q1Outs, icon: '🔴' },
      { label: 'Avg Quali Pos', value: avgQualiPosition, icon: '🏁' },
      { label: 'Avg Race Pos', value: avgRacePosition, icon: '🏎️' },
      { label: 'Avg Improvement', value: improvementDisplay, icon: '📈' }
    ];

    stats.forEach(stat => {
      const statItem = this.createElement('div', 'stat-item');
      
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
        const dnfResults = raceResults.filter(r => 
          !r.position || r.position === 0 || 
          (r.status && !r.status.toLowerCase().includes('finished'))
        );
        const raceNames = dnfResults.map(r => {
          const race = dataStore.indexes.raceById.get(r.raceId);
          return race ? race.raceName : 'Race';
        });
        tooltipText = `DNFs at:\n${raceNames.join('\n')}`;
      } else if (stat.label === 'Podiums' && stat.value > 0) {
        const podiumResults = raceResults.filter(r => parseInt(r.position) <= 3);
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
      
      const tooltipEl = this.createElement('div', 'stat-tooltip');
      if (tooltipText) {
        tooltipEl.textContent = tooltipText;
      }
      
      statItem.innerHTML = `
        <div class="stat-value">${stat.icon} ${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
      `;
      
      if (tooltipText) {
        statItem.appendChild(tooltipEl);
        
        statItem.addEventListener('mouseenter', (e) => this.showTooltip(e, tooltipEl));
        statItem.addEventListener('mouseleave', () => this.hideTooltip(tooltipEl));
      }
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

  renderCareerStats() {
    // This would show career summary data if available
    const careerData = dataStore.data.driverCareerSummary.find(d => d.driverId === this.driverId);

    if (!careerData) {
      return;
    }

    const careerCard = this.createElement('div', 'stats-card');
    const title = this.createElement('h2', 'stats-title', 'Career Statistics');
    careerCard.appendChild(title);

    const careerGrid = this.createElement('div', 'stats-grid');

    const careerStats = [
      { label: 'Total Points', value: careerData.totalPoints || 0 },
      { label: 'Races', value: careerData.totalRaces || 0 },
      { label: 'Wins', value: careerData.totalWins || 0 },
      { label: 'Podiums', value: careerData.totalPodiums || 0 },
      { label: 'Pole Positions', value: careerData.totalPoles || 0 },
      { label: 'Championships', value: careerData.championships || 0 }
    ];

    careerStats.forEach(stat => {
      const statItem = this.createElement('div', 'stat-item');
      statItem.innerHTML = `
        <div class="stat-value">${stat.value}</div>
        <div class="stat-label">${stat.label}</div>
      `;
      careerGrid.appendChild(statItem);
    });

    careerCard.appendChild(careerGrid);
    this.root.appendChild(careerCard);
  }

  renderRaceHistory() {
    // Get all race results for this driver
    const driverResults = dataStore.data.raceResults.filter(r => r.driverId === this.driverId);

    if (driverResults.length === 0) {
      return;
    }

    const historyCard = this.createElement('div', 'race-history-card');
    const title = this.createElement('h2', 'stats-title', 'Race Results');
    historyCard.appendChild(title);

    const table = this.createElement('table', 'results-table');

    table.innerHTML = `
      <thead>
        <tr>
          <th>Round</th>
          <th>Race</th>
          <th>Grid</th>
          <th>Position</th>
          <th>Points</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${driverResults.map(result => {
          const race = dataStore.indexes.raceById.get(result.raceId);
          return `
            <tr>
              <td>${race ? race.round : '-'}</td>
              <td class="race-name">
                <a href="#/race/${result.raceId}">${race ? race.raceName : result.raceId}</a>
              </td>
              <td>${result.grid || '-'}</td>
              <td class="position ${result.position <= 3 ? 'podium' : ''}">${result.position}</td>
              <td class="points">${result.points || 0}</td>
              <td class="status">${result.status || '-'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;

    const tableWrapper = this.createElement('div', 'table-responsive');
    tableWrapper.appendChild(table);
    historyCard.appendChild(tableWrapper);
    this.root.appendChild(historyCard);
  }

  renderRankProgressionChart() {
    // Calculate rank progression across the season for all drivers
    const raceResults = dataStore.data.raceResults.filter(r => 
      r.season === dataStore.season
    );

    if (raceResults.length === 0) return;

    // Group by round and calculate cumulative points and ranks for all drivers
    const rounds = [...new Set(raceResults.map(r => r.round))].sort((a, b) => a - b);
    const driverCumulativePoints = new Map();
    const allDriverRankData = new Map();

    rounds.forEach(round => {
      const roundResults = raceResults.filter(r => r.round === round);
      
      // Update cumulative points for all drivers
      roundResults.forEach(result => {
        const currentPoints = driverCumulativePoints.get(result.driverId) || 0;
        driverCumulativePoints.set(result.driverId, currentPoints + (parseFloat(result.points) || 0));
      });

      // Calculate ranks based on cumulative points
      const sortedDrivers = Array.from(driverCumulativePoints.entries())
        .sort((a, b) => b[1] - a[1]); // Sort by points descending

      // Get race name
      const race = dataStore.data.races.find(r => r.round === round && r.season === dataStore.season);
      const raceName = race && race.name ? race.name.replace(' Grand Prix', '') : `Round ${round}`;

      // Store rank for each driver
      sortedDrivers.forEach(([driverId, points], index) => {
        if (!allDriverRankData.has(driverId)) {
          allDriverRankData.set(driverId, []);
        }
        allDriverRankData.get(driverId).push({
          round,
          raceName,
          rank: index + 1
        });
      });
    });

    if (allDriverRankData.size === 0) return;

    const chartSection = this.createElement('section', 'rank-progression');
    const heading = this.createElement('h2', 'stats-title', 'Championship Position Progression');
    chartSection.appendChild(heading);

    const canvasContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'driverRankChart';
    canvasContainer.appendChild(canvas);
    chartSection.appendChild(canvasContainer);

    this.root.appendChild(chartSection);

    // Render chart after DOM insertion
    setTimeout(() => {
      if (typeof Chart === 'undefined') {
        console.error('[DriverProfileView] Chart.js not loaded');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[DriverProfileView] Could not get canvas context');
        return;
      }

      // Create datasets for all drivers
      const datasets = [];
      const raceLabels = allDriverRankData.get(this.driverId)?.[0]?.raceName ? 
        allDriverRankData.get(this.driverId).map(d => d.raceName) : 
        [...allDriverRankData.values()][0].map(d => d.raceName);

      allDriverRankData.forEach((rankData, driverId) => {
        const driver = dataStore.data.drivers.find(d => d.driverId === driverId);
        const isCurrentDriver = driverId === this.driverId;
        
        datasets.push({
          label: driver ? driver.name : driverId,
          data: rankData.map(d => d.rank),
          borderColor: isCurrentDriver ? (this.driver.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.3)',
          backgroundColor: isCurrentDriver ? ((this.driver.teamColor || '#E10600') + '33') : 'rgba(160, 160, 160, 0.1)',
          borderWidth: isCurrentDriver ? 4 : 1.5,
          pointRadius: isCurrentDriver ? 6 : 2,
          pointHoverRadius: isCurrentDriver ? 8 : 4,
          pointBackgroundColor: isCurrentDriver ? (this.driver.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.5)',
          pointBorderColor: isCurrentDriver ? '#1C2127' : 'rgba(160, 160, 160, 0.3)',
          pointBorderWidth: isCurrentDriver ? 2 : 1,
          tension: 0.3,
          fill: false,
          order: isCurrentDriver ? 1 : 2
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
                  // Show only the current driver in legend
                  return item.text === (dataStore.data.drivers.find(d => d.driverId === this.driverId)?.name || '');
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
    // Calculate cumulative points progression across the season for all drivers
    const raceResults = dataStore.data.raceResults.filter(r => 
      r.season === dataStore.season
    ).sort((a, b) => a.round - b.round);

    if (raceResults.length === 0) return;

    // Group by driver and round
    const rounds = [...new Set(raceResults.map(r => r.round))].sort((a, b) => a - b);
    const allDriverPointsData = new Map();

    // Process each driver's points progression
    const driverIds = [...new Set(raceResults.map(r => r.driverId))];
    
    const sprintResultsBySeason = dataStore.data.sprintResults.filter(r =>
      r.season === dataStore.season
    );

    driverIds.forEach(driverId => {
      const driverResults = raceResults.filter(r => r.driverId === driverId);
      const driverSprintResults = sprintResultsBySeason.filter(r => r.driverId === driverId);
      let cumulativePoints = 0;
      const pointsData = [];

      rounds.forEach(round => {
        const roundResult = driverResults.find(r => r.round === round);
        if (roundResult) {
          cumulativePoints += parseFloat(roundResult.points) || 0;
        }
        const sprintResult = driverSprintResults.find(r => r.round === round);
        if (sprintResult) {
          cumulativePoints += parseFloat(sprintResult.points) || 0;
        }
        
        const race = dataStore.data.races.find(r => r.round === round && r.season === dataStore.season);
        const raceName = race && race.name ? race.name.replace(' Grand Prix', '') : `Round ${round}`;
        
        pointsData.push({
          round,
          raceName,
          points: cumulativePoints
        });
      });

      if (pointsData.length > 0 && cumulativePoints > 0) {
        allDriverPointsData.set(driverId, pointsData);
      }
    });

    if (allDriverPointsData.size === 0) return;

    const chartSection = this.createElement('section', 'points-progression');
    const heading = this.createElement('h2', 'stats-title', 'Cumulative Points Progression');
    chartSection.appendChild(heading);

    const canvasContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'driverPointsChart';
    canvasContainer.appendChild(canvas);
    chartSection.appendChild(canvasContainer);

    this.root.appendChild(chartSection);

    // Render chart after DOM insertion
    setTimeout(() => {
      if (typeof Chart === 'undefined') {
        console.error('[DriverProfileView] Chart.js not loaded');
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[DriverProfileView] Could not get canvas context');
        return;
      }

      // Create datasets for all drivers
      const datasets = [];
      const raceLabels = allDriverPointsData.get(this.driverId)?.[0]?.raceName ? 
        allDriverPointsData.get(this.driverId).map(d => d.raceName) : 
        [...allDriverPointsData.values()][0].map(d => d.raceName);

      allDriverPointsData.forEach((pointsData, driverId) => {
        const driver = dataStore.data.drivers.find(d => d.driverId === driverId);
        const isCurrentDriver = driverId === this.driverId;
        
        datasets.push({
          label: driver ? driver.name : driverId,
          data: pointsData.map(d => d.points),
          borderColor: isCurrentDriver ? (this.driver.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.3)',
          backgroundColor: isCurrentDriver ? ((this.driver.teamColor || '#E10600') + '33') : 'rgba(160, 160, 160, 0.1)',
          borderWidth: isCurrentDriver ? 4 : 1.5,
          pointRadius: isCurrentDriver ? 6 : 2,
          pointHoverRadius: isCurrentDriver ? 8 : 4,
          pointBackgroundColor: isCurrentDriver ? (this.driver.teamColor || '#E10600') : 'rgba(160, 160, 160, 0.5)',
          pointBorderColor: isCurrentDriver ? '#1C2127' : 'rgba(160, 160, 160, 0.3)',
          pointBorderWidth: isCurrentDriver ? 2 : 1,
          tension: 0.3,
          fill: isCurrentDriver,
          order: isCurrentDriver ? 1 : 2
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
                  // Show only the current driver in legend
                  return item.text === (dataStore.data.drivers.find(d => d.driverId === this.driverId)?.name || '');
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
