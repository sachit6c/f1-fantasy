// views/team-comparison-view.js
// Team comparison view for fantasy league head-to-head

import { BaseView } from './base-view.js';
import { fantasyTeamScorer } from '../lib/fantasy-team-scorer.js';
import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';

export class TeamComparisonView extends BaseView {
  constructor() {
    super();
    this.currentTab = null; // Set by render() based on whether a draft exists
    this.chartInstances = new Map(); // Track Chart.js instances for cleanup
    this.highlightedEntity = null; // Track highlighted driver/constructor in charts
    this.highlightedPlayer = null; // Track highlighted player in comparison chart
  }

  // Helper method to generate unique driver color based on team color
  getDriverColor(teamColor, driverIndex) {
    // Convert hex to HSL, adjust lightness for each driver
    const hex = teamColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    // Adjust lightness: first driver darker, second driver lighter
    const lightness = driverIndex === 0 ? Math.max(0.3, l - 0.1) : Math.min(0.7, l + 0.15);

    // Convert back to RGB
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r2, g2, b2;
    if (s === 0) {
      r2 = g2 = b2 = lightness;
    } else {
      const q = lightness < 0.5 ? lightness * (1 + s) : lightness + s - lightness * s;
      const p = 2 * lightness - q;
      r2 = hue2rgb(p, q, h + 1/3);
      g2 = hue2rgb(p, q, h);
      b2 = hue2rgb(p, q, h - 1/3);
    }

    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
  }

  async render(container, params) {
    this.root = container;

    // Ensure draft store has loaded its current season
    if (!draftStore.currentSeason) {
      draftStore.loadCurrentSeason();
    }

    // Sync season from draft store FIRST (before loading data)
    if (draftStore.currentSeason) {
      dataStore.setSeason(draftStore.currentSeason);
    }

    // Ensure dataStore is loaded with the correct season
    // Also force reload if race results exist but qualifying is empty
    // (happens when page was loaded before qualifying CSV was populated)
    const hasRaceData = dataStore.data.raceResults.length > 0;
    const missingQualifying = hasRaceData && dataStore.data.qualifying.length === 0;
    if (!dataStore.loaded || missingQualifying) {
      if (missingQualifying) {
        console.log('[TeamComparison] Qualifying data missing despite race results — forcing reload');
        dataStore.loaded = false;
      }
      this.root.appendChild(this.createLoadingSpinner());
      await dataStore.load();
      this.root.innerHTML = '';
    }

    const draft = draftStore.draft;

    // Check if draft exists and is completed for Team Comparison tab
    const hasDraft = draft && draft.status === 'completed' && draft.players.length === 2;
    
    // Default to driver-standings if no draft, otherwise comparison
    if (!this.currentTab || (this.currentTab === 'comparison' && !hasDraft)) {
      this.currentTab = hasDraft ? 'comparison' : 'driver-standings';
    }

    // Clean up existing chart instances
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances.clear();

    this.root.innerHTML = '';

    // Render header
    this.renderHeader();

    // Render tab navigation
    this.renderTabNavigation(hasDraft);

    // Render all tab panels (hidden/shown via CSS)
    this.renderAllTabPanels(hasDraft);

    // Re-render when a background auto-refresh completes (e.g. missing race results fetched)
    const onRefreshed = () => {
      if (this.root) {
        window.removeEventListener('datastore:refreshed', onRefreshed);
        this.render(container, params);
      }
    };
    window.removeEventListener('datastore:refreshed', onRefreshed); // clean up any stale listener
    window.addEventListener('datastore:refreshed', onRefreshed, { once: true });
  }

  renderHeader() {
    const header = this.createElement('div', 'comparison-header');
    const title = this.createElement('h1', 'page-title', 'Teams & Standings');
    header.appendChild(title);
    this.root.appendChild(header);
  }

  renderTabNavigation(hasDraft) {
    const tabNav = this.createElement('div', 'tab-navigation');
    
    // Get player names for comparison tab label
    let comparisonLabel = 'Team Comparison';
    if (hasDraft) {
      const draft = draftStore.draft;
      const [player1, player2] = draft.players;
      comparisonLabel = `${player1.name} vs ${player2.name}`;
    }

    const svgComparison = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="4" y1="19" x2="6" y2="21"/></svg>`;
    const svgDrivers = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    const svgConstructors = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`;

    const tabs = [
      { id: 'comparison',            label: comparisonLabel,         icon: svgComparison,   disabled: !hasDraft },
      { id: 'driver-standings',      label: 'Driver Standings',      icon: svgDrivers,      disabled: false },
      { id: 'constructor-standings', label: 'Constructor Standings', icon: svgConstructors, disabled: false }
    ];

    tabs.forEach(tab => {
      const btn = this.createElement('button', [
        'tab-btn',
        this.currentTab === tab.id ? 'active' : ''
      ]);
      btn.innerHTML = `<span class="tab-icon" aria-hidden="true">${tab.icon}</span><span>${tab.label}</span>`;
      btn.disabled = tab.disabled;
      
      if (!tab.disabled) {
        btn.addEventListener('click', () => {
          // Update active state
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Show/hide tab panels
          document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
          });
          document.getElementById(`tab-${tab.id}`).classList.add('active');
          
          this.currentTab = tab.id;
        });
      }
      
      tabNav.appendChild(btn);
    });
    
    this.root.appendChild(tabNav);
  }

  renderAllTabPanels(hasDraft) {
    // Team Comparison Tab
    const comparisonPanel = this.createElement('div', [
      'tab-panel',
      this.currentTab === 'comparison' ? 'active' : ''
    ]);
    comparisonPanel.id = 'tab-comparison';
    this.renderComparisonTab(comparisonPanel, hasDraft);
    this.root.appendChild(comparisonPanel);

    // Driver Standings Tab
    const driverPanel = this.createElement('div', [
      'tab-panel',
      this.currentTab === 'driver-standings' ? 'active' : ''
    ]);
    driverPanel.id = 'tab-driver-standings';
    this.renderDriverStandingsTab(driverPanel);
    this.root.appendChild(driverPanel);

    // Constructor Standings Tab
    const constructorPanel = this.createElement('div', [
      'tab-panel',
      this.currentTab === 'constructor-standings' ? 'active' : ''
    ]);
    constructorPanel.id = 'tab-constructor-standings';
    this.renderConstructorStandingsTab(constructorPanel);
    this.root.appendChild(constructorPanel);
  }

  renderComparisonTab(container, hasDraft) {
    if (!hasDraft) {
      const message = this.createElement('div', 'no-draft-message');
      message.innerHTML = `
        <p>Team comparison requires a completed draft with 2 players.</p>
        <a href="#/draft" class="btn-primary">Go to Draft</a>
      `;
      container.appendChild(message);
      return;
    }

    try {
      const draft = draftStore.draft;
      const [player1, player2] = draft.players;
      const comparison = fantasyTeamScorer.compareTeams(
        player1.playerId,
        player2.playerId,
        draftStore,
        dataStore
      );

      // Season standings
      this.renderSeasonStandings(comparison, container);

      // Diverging bar chart for statistics comparison
      this.renderStatisticsComparison(comparison, container);

      // Driver matchups (1v1 head-to-head)
      this.renderDriverMatchups(comparison, container);

      // Driver contributions
      this.renderDriverContributions(comparison, container);

      // Race-by-race breakdown
      this.renderRaceBreakdown(comparison, container);

      // Points trend chart
      this.renderPointsTrend(comparison, container);

      // Action buttons
      this.renderActions(container);

    } catch (err) {
      container.appendChild(
        this.createErrorMessage(`Failed to load team comparison: ${err.message}`)
      );
    }
  }

  renderSeasonStandings(comparison, container) {
    const section = this.createElement('section', 'season-standings');
    const heading = this.createElement('h2', 'section-heading', 'Season Standings');
    section.appendChild(heading);

    const standingsGrid = this.createElement('div', 'standings-grid');

    // Player 1 card
    const p1Card = this.createPlayerCard(comparison.player1, comparison.leader === comparison.player1.playerId);
    standingsGrid.appendChild(p1Card);

    // Player 2 card
    const p2Card = this.createPlayerCard(comparison.player2, comparison.leader === comparison.player2.playerId);
    standingsGrid.appendChild(p2Card);

    section.appendChild(standingsGrid);

    // Lead margin
    const leaderName = comparison.leader === comparison.player1.playerId
      ? comparison.player1.name
      : comparison.player2.name;

    const marginText = comparison.margin === 0
      ? 'Teams are tied!'
      : `${leaderName} leads by ${comparison.margin} points`;

    const margin = this.createElement('p', 'lead-margin', marginText);
    section.appendChild(margin);

    container.appendChild(section);
  }

  createPlayerCard(player, isLeader) {
    const card = this.createElement('div', ['player-card', isLeader ? 'leader' : '']);

    const name = this.createElement('h3', 'player-card-name', player.name);
    if (isLeader && player.totalPoints > 0) {
      const trophy = document.createElement('span');
      trophy.classList.add('trophy-icon');
      trophy.textContent = ' 🏆';
      name.appendChild(trophy);
    }
    card.appendChild(name);

    const avgPerRace = player.races.length > 0
      ? (player.totalPoints / player.races.length).toFixed(1)
      : '0.0';

    const stats = [
      { label: 'Total Points', value: player.totalPoints || 0, icon: '📊' },
      { label: 'Race Wins', value: player.raceWins || 0, icon: '🥇' },
      { label: 'H2H Race Wins', value: player.fantasyWins || 0, icon: '⚔️' },
      { label: 'Podiums', value: player.podiums || 0, icon: '🏁' },
      { label: 'Poles', value: player.poles || 0, icon: '🎯' },
      { label: 'Fastest Laps', value: player.fastestLaps || 0, icon: '🟣' },
      { label: 'Q3 Apps', value: player.q3Apps || 0, icon: '🟢' },
      { label: 'Q2 Outs', value: player.q2Outs || 0, icon: '🟡' },
      { label: 'Q1 Outs', value: player.q1Outs || 0, icon: '🔴' },
      { label: 'DNFs', value: player.dnfs || 0, icon: '❌' },
      { label: 'DNS', value: player.dns || 0, icon: '⛔' },
      { label: 'Avg per Race', value: avgPerRace, icon: '📈' }
    ];

    stats.forEach(stat => {
      const statRow = this.createElement('div', 'stat-row');
      const label = this.createElement('span', 'stat-label');
      label.innerHTML = `<span class="stat-icon">${stat.icon}</span>${stat.label}:`;
      const value = this.createElement('span', 'stat-value', String(stat.value || 0));
      statRow.appendChild(label);
      statRow.appendChild(value);
      card.appendChild(statRow);
    });

    return card;
  }

  renderStatisticsComparison(comparison, container) {
    const section = this.createElement('section', 'statistics-comparison');
    const heading = this.createElement('h2', 'section-heading', 'Head-to-Head Statistics');
    section.appendChild(heading);

    const player1 = comparison.player1;
    const player2 = comparison.player2;

    // Define statistics to compare
    const statsToCompare = [
      { label: 'Total Points', key: 'totalPoints', p1: player1.totalPoints || 0, p2: player2.totalPoints || 0 },
      { label: 'Race Wins', key: 'raceWins', p1: player1.raceWins || 0, p2: player2.raceWins || 0 },
      { label: 'H2H Race Wins', key: 'fantasyWins', p1: player1.fantasyWins || 0, p2: player2.fantasyWins || 0 },
      { label: 'Podiums', key: 'podiums', p1: player1.podiums || 0, p2: player2.podiums || 0 },
      { label: 'Poles', key: 'poles', p1: player1.poles || 0, p2: player2.poles || 0 },
      { label: 'Fastest Laps', key: 'fastestLaps', p1: player1.fastestLaps || 0, p2: player2.fastestLaps || 0 },
      { label: 'Q3 Appearances', key: 'q3Apps', p1: player1.q3Apps || 0, p2: player2.q3Apps || 0 },
      { label: 'Q2 Eliminations', key: 'q2Outs', p1: player1.q2Outs || 0, p2: player2.q2Outs || 0 },
      { label: 'Q1 Eliminations', key: 'q1Outs', p1: player1.q1Outs || 0, p2: player2.q1Outs || 0 },
      { label: 'DNFs', key: 'dnfs', p1: player1.dnfs || 0, p2: player2.dnfs || 0 },
      { label: 'DNS', key: 'dns', p1: player1.dns || 0, p2: player2.dns || 0 }
    ];

    // Create legend
    const legend = this.createElement('div', 'diverging-chart-legend');
    const p1Legend = this.createElement('div', 'legend-item');
    p1Legend.innerHTML = `<span class="legend-color player1-color"></span><span>${player1.name}</span>`;
    const p2Legend = this.createElement('div', 'legend-item');
    p2Legend.innerHTML = `<span class="legend-color player2-color"></span><span>${player2.name}</span>`;
    legend.appendChild(p1Legend);
    legend.appendChild(p2Legend);
    section.appendChild(legend);

    // Create chart container
    const chartContainer = this.createElement('div', 'diverging-chart');

    statsToCompare.forEach(stat => {
      const total = stat.p1 + stat.p2;
      const p1Percentage = total > 0 ? (stat.p1 / total) * 100 : 50;
      const p2Percentage = total > 0 ? (stat.p2 / total) * 100 : 50;

      const barRow = this.createElement('div', 'diverging-bar-row');

      // Player 1 bar (left side, grows from left edge toward center)
      const p1Bar = this.createElement('div', 'diverging-bar-left');
      p1Bar.style.width = `${p1Percentage}%`;
      const p1Value = this.createElement('span', ['bar-value', 'left']);
      p1Value.textContent = stat.p1;
      p1Bar.appendChild(p1Value);

      // Player 2 bar (right side, grows from right edge toward center)
      const p2Bar = this.createElement('div', 'diverging-bar-right');
      p2Bar.style.width = `${p2Percentage}%`;
      const p2Value = this.createElement('span', ['bar-value', 'right']);
      p2Value.textContent = stat.p2;
      p2Bar.appendChild(p2Value);

      // Bars go first (flex row, flush against each other)
      barRow.appendChild(p1Bar);
      barRow.appendChild(p2Bar);

      // Center label overlaid on top
      const centerLabel = this.createElement('div', 'diverging-bar-label');
      let labelText = stat.label;
      if (stat.p1 !== stat.p2 && total > 0) {
        const leaderPercentage = Math.max(p1Percentage, p2Percentage);
        labelText += ` (${leaderPercentage.toFixed(1)}%)`;
      }
      centerLabel.textContent = labelText;
      barRow.appendChild(centerLabel);

      chartContainer.appendChild(barRow);
    });

    section.appendChild(chartContainer);
    container.appendChild(section);
  }

  renderDriverMatchups(comparison, container) {
    if (!comparison.driverMatchups || comparison.driverMatchups.matchups.length === 0) {
      return;
    }

    const section = this.createElement('section', 'driver-matchups');
    const heading = this.createElement('h2', 'section-heading', 'Teammate Battles');
    const subheading = this.createElement('p', 'section-subheading', 
      'Direct comparison of drivers from the same team picked by each player');
    section.appendChild(heading);
    section.appendChild(subheading);

    const p1Name = comparison.player1.name;
    const p2Name = comparison.player2.name;

    // Calculate global maximums for each stat across ALL matchups
    const globalMaxes = {
      points: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
      fastestLaps: 0,
      dnfs: 0,
      q3Apps: 0,
      q2Outs: 0,
      q1Outs: 0,
      qualiBeats: 0,
      raceBeats: 0
    };

    comparison.driverMatchups.matchups.forEach(matchup => {
      globalMaxes.points = Math.max(globalMaxes.points, matchup.driver1Points || 0, matchup.driver2Points || 0);
      globalMaxes.wins = Math.max(globalMaxes.wins, matchup.driver1Wins || 0, matchup.driver2Wins || 0);
      globalMaxes.podiums = Math.max(globalMaxes.podiums, matchup.driver1Podiums || 0, matchup.driver2Podiums || 0);
      globalMaxes.poles = Math.max(globalMaxes.poles, matchup.driver1Poles || 0, matchup.driver2Poles || 0);
      globalMaxes.fastestLaps = Math.max(globalMaxes.fastestLaps, matchup.driver1FastestLaps || 0, matchup.driver2FastestLaps || 0);
      globalMaxes.dnfs = Math.max(globalMaxes.dnfs, matchup.driver1DNFs || 0, matchup.driver2DNFs || 0);
      globalMaxes.q3Apps = Math.max(globalMaxes.q3Apps, matchup.driver1Q3Apps || 0, matchup.driver2Q3Apps || 0);
      globalMaxes.q2Outs = Math.max(globalMaxes.q2Outs, matchup.driver1Q2Outs || 0, matchup.driver2Q2Outs || 0);
      globalMaxes.q1Outs = Math.max(globalMaxes.q1Outs, matchup.driver1Q1Outs || 0, matchup.driver2Q1Outs || 0);
      globalMaxes.qualiBeats = Math.max(globalMaxes.qualiBeats, matchup.driver1QualiBeats || 0, matchup.driver2QualiBeats || 0);
      globalMaxes.raceBeats = Math.max(globalMaxes.raceBeats, matchup.driver1RaceBeats || 0, matchup.driver2RaceBeats || 0);
    });

    // Display each matchup with bar graphs
    const cards = [];
    comparison.driverMatchups.matchups.forEach(matchup => {
      const matchupCard = this.createElement('div', 'teammate-matchup-card');
      
      // Find constructor data for this team
      const constructor = dataStore.data.constructors.find(c => 
        c.name.toLowerCase().includes(matchup.team.toLowerCase()) ||
        matchup.team.toLowerCase().includes(c.name.toLowerCase())
      );
      
      // Team header (clickable to constructor profile)
      // Header row: Player 1 | Team Logo | Player 2
      const headerRow = this.createElement('div', 'matchup-header-row');
      
      // Get driver data for photos
      const driver1Data = dataStore.indexes.driverById.get(matchup.driver1Id);
      const driver2Data = dataStore.indexes.driverById.get(matchup.driver2Id);
      
      // Player 1 (left)
      const driver1Header = this.createElement('div', 'matchup-driver-header');
      if (driver1Data) {
        const photo1 = this.createElement('img', 'matchup-driver-photo');
        photo1.src = driver1Data.photoUrl;
        photo1.alt = driver1Data.name;
        photo1.onerror = () => {
          photo1.style.display = 'none';
        };
        driver1Header.appendChild(photo1);
      }
      const driver1Info = this.createElement('div', 'matchup-driver-info');
      driver1Info.innerHTML = `
        <span class="player-label">${p1Name}</span>
        <a href="#/driver/${matchup.driver1Id}" class="driver-name-large">${matchup.driver1Code}</a>
      `;
      driver1Header.appendChild(driver1Info);
      
      // Team Logo (center)
      const teamLogoContainer = this.createElement('div', 'matchup-team-logo-container');
      const teamHeader = this.createElement('a', 'matchup-team-header');
      teamHeader.textContent = matchup.team;
      if (constructor) {
        teamHeader.href = `#/constructor/${constructor.constructorId}`;
        teamHeader.style.cursor = 'pointer';
        
        const teamLogo = this.createElement('img', 'matchup-team-logo');
        teamLogo.src = dataStore.getConstructorLogoUrl(constructor.constructorId);
        teamLogo.alt = matchup.team;
        teamLogo.onerror = () => {
          teamLogo.style.display = 'none';
        };
        teamLogoContainer.appendChild(teamLogo);
      } else {
        teamHeader.style.cursor = 'default';
      }
      teamLogoContainer.appendChild(teamHeader);
      
      // Player 2 (right)
      const driver2Header = this.createElement('div', 'matchup-driver-header');
      const driver2Info = this.createElement('div', 'matchup-driver-info');
      driver2Info.innerHTML = `
        <span class="player-label">${p2Name}</span>
        <a href="#/driver/${matchup.driver2Id}" class="driver-name-large">${matchup.driver2Code}</a>
      `;
      driver2Header.appendChild(driver2Info);
      if (driver2Data) {
        const photo2 = this.createElement('img', 'matchup-driver-photo');
        photo2.src = driver2Data.photoUrl;
        photo2.alt = driver2Data.name;
        photo2.onerror = () => {
          photo2.style.display = 'none';
        };
        driver2Header.appendChild(photo2);
      }
      
      headerRow.appendChild(driver1Header);
      headerRow.appendChild(teamLogoContainer);
      headerRow.appendChild(driver2Header);
      matchupCard.appendChild(headerRow);

      // Stats comparison with bar graphs
      const statsContainer = this.createElement('div', 'matchup-stats-container');

      const statGroups = [
        {
          stats: [
            { label: 'Points', value1: matchup.driver1Points || 0, value2: matchup.driver2Points || 0, icon: '📊', key: 'points' },
            { label: 'Wins', value1: matchup.driver1Wins || 0, value2: matchup.driver2Wins || 0, icon: '🥇', key: 'wins' },
            { label: 'Podiums', value1: matchup.driver1Podiums || 0, value2: matchup.driver2Podiums || 0, icon: '🏁', key: 'podiums' }
          ]
        },
        {
          stats: [
            { label: 'Poles', value1: matchup.driver1Poles || 0, value2: matchup.driver2Poles || 0, icon: '🎯', key: 'poles' },
            { label: 'Fastest Laps', value1: matchup.driver1FastestLaps || 0, value2: matchup.driver2FastestLaps || 0, icon: '🟣', key: 'fastestLaps' }
          ]
        },
        {
          stats: [
            { label: 'Quali Beats', value1: matchup.driver1QualiBeats || 0, value2: matchup.driver2QualiBeats || 0, icon: '🎯', key: 'qualiBeats' },
            { label: 'Race Beats', value1: matchup.driver1RaceBeats || 0, value2: matchup.driver2RaceBeats || 0, icon: '🏎️', key: 'raceBeats' }
          ]
        },
        {
          stats: [
            { label: 'Q3 Apps', value1: matchup.driver1Q3Apps || 0, value2: matchup.driver2Q3Apps || 0, icon: '🟢', key: 'q3Apps' },
            { label: 'Q2 Outs', value1: matchup.driver1Q2Outs || 0, value2: matchup.driver2Q2Outs || 0, icon: '🟡', key: 'q2Outs' },
            { label: 'Q1 Outs', value1: matchup.driver1Q1Outs || 0, value2: matchup.driver2Q1Outs || 0, icon: '🔴', key: 'q1Outs' }
          ]
        },
        {
          stats: [
            { label: 'DNFs', value1: matchup.driver1DNFs || 0, value2: matchup.driver2DNFs || 0, icon: '❌', key: 'dnfs' }
          ]
        }
      ];

      statGroups.forEach(group => {
        group.stats.forEach(stat => {
        const statRow = this.createElement('div', 'matchup-stat-row');
        
        // Ensure values are numbers
        const val1 = Number(stat.value1) || 0;
        const val2 = Number(stat.value2) || 0;
        
        // Use global maximum for this stat across all matchups
        const maxValue = Math.max(globalMaxes[stat.key], 1); // Minimum 1 to avoid division by zero
        const percent1 = (val1 / maxValue) * 100;
        const percent2 = (val2 / maxValue) * 100;

        // Driver 1 bar (left column)
        const bar1Container = this.createElement('div', 'bar-container-left');
        const bar1 = this.createElement('div', ['bar', 'bar-player1']);
        bar1.style.width = `${percent1}%`;
        const value1 = this.createElement('span', 'bar-value-left', val1.toString());
        bar1Container.appendChild(bar1);
        bar1Container.appendChild(value1);
        statRow.appendChild(bar1Container);
        
        // Stat label (center column)
        const statLabel = this.createElement('div', 'matchup-stat-label');
        statLabel.innerHTML = `<span class="stat-icon">${stat.icon}</span> ${stat.label}`;
        statRow.appendChild(statLabel);
        
        // Driver 2 bar (right column)
        const bar2Container = this.createElement('div', 'bar-container-right');
        const bar2 = this.createElement('div', ['bar', 'bar-player2']);
        bar2.style.width = `${percent2}%`;
        const value2 = this.createElement('span', 'bar-value-right', val2.toString());
        bar2Container.appendChild(bar2);
        bar2Container.appendChild(value2);
        statRow.appendChild(bar2Container);

        statsContainer.appendChild(statRow);
        });
      });

      matchupCard.appendChild(statsContainer);
      cards.push(matchupCard);
    });

    if (cards.length === 1) {
      section.appendChild(cards[0]);
    } else {
      // Carousel wrapper
      const carousel = this.createElement('div', 'matchup-carousel');

      const prevBtn = this.createElement('button', ['carousel-nav-btn', 'carousel-prev-btn']);
      prevBtn.setAttribute('aria-label', 'Previous matchup');
      prevBtn.innerHTML = '&#8249;';

      const viewport = this.createElement('div', 'carousel-viewport');
      cards.forEach(card => viewport.appendChild(card));

      const nextBtn = this.createElement('button', ['carousel-nav-btn', 'carousel-next-btn']);
      nextBtn.setAttribute('aria-label', 'Next matchup');
      nextBtn.innerHTML = '&#8250;';

      carousel.appendChild(prevBtn);
      carousel.appendChild(viewport);
      carousel.appendChild(nextBtn);

      // Footer: dots + counter
      const footer = this.createElement('div', 'carousel-footer');
      const dotsEl = this.createElement('div', 'carousel-dots');
      const counter = this.createElement('span', 'carousel-counter');

      cards.forEach((_, i) => {
        const dot = this.createElement('button', 'carousel-dot');
        dot.setAttribute('aria-label', `Go to matchup ${i + 1}`);
        dotsEl.appendChild(dot);
      });

      footer.appendChild(dotsEl);
      footer.appendChild(counter);

      section.appendChild(carousel);
      section.appendChild(footer);

      // Navigation state
      let current = 0;
      const total = cards.length;
      const dotEls = Array.from(dotsEl.querySelectorAll('.carousel-dot'));

      const updateUI = () => {
        dotEls.forEach((d, i) => d.classList.toggle('active', i === current));
        counter.textContent = `${current + 1} / ${total}`;
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === total - 1;
      };

      const goTo = (index) => {
        const clamped = Math.max(0, Math.min(index, total - 1));
        viewport.scrollTo({ left: clamped * viewport.offsetWidth, behavior: 'smooth' });
      };

      // Sync dots/counter/buttons as the viewport scrolls (covers trackpad, touch, button clicks)
      let scrollRaf = null;
      viewport.addEventListener('scroll', () => {
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = requestAnimationFrame(() => {
          current = Math.round(viewport.scrollLeft / viewport.offsetWidth);
          updateUI();
        });
      }, { passive: true });

      prevBtn.addEventListener('click', () => goTo(current - 1));
      nextBtn.addEventListener('click', () => goTo(current + 1));
      dotEls.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

      // Initialize
      updateUI();
    }

    container.appendChild(section);
  }

  renderDriverContributions(comparison, container) {
    const section = this.createElement('section', 'driver-contributions');
    const heading = this.createElement('h2', 'section-heading', 'Driver Contributions');
    section.appendChild(heading);

    const grid = this.createElement('div', 'contributions-grid');

    // Player 1 table
    const p1Table = this.createContributionTable(comparison.player1);
    grid.appendChild(p1Table);

    // Player 2 table
    const p2Table = this.createContributionTable(comparison.player2);
    grid.appendChild(p2Table);

    section.appendChild(grid);
    container.appendChild(section);
  }

  createContributionTable(player) {
    const container = this.createElement('div', 'contribution-container');

    const playerName = this.createElement('h3', 'contribution-header', player.name);
    container.appendChild(playerName);

    const table = this.createElement('table', 'contribution-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Driver</th>
          <th>Pos</th>
          <th>Points</th>
          <th>Wins</th>
          <th>Podiums</th>
          <th>FL</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    // Sort drivers by points descending
    const sortedDrivers = [...player.drivers].sort((a, b) => b.totalPoints - a.totalPoints);

    sortedDrivers.forEach(driver => {
      const driverData = dataStore.indexes.driverById.get(driver.driverId);
      const row = document.createElement('tr');

      row.innerHTML = `
        <td class="driver-name">
          <a href="#/driver/${driver.driverId}">${driverData ? driverData.code : driver.driverId}</a>
        </td>
        <td class="position">P${driver.position ?? '—'}</td>
        <td class="total positive">
          ${driver.totalPoints}
        </td>
        <td class="wins">${driver.wins}</td>
        <td class="podiums">${driver.podiums || 0}</td>
        <td class="fastest-laps">${driver.fastestLaps || 0}</td>
      `;

      tbody.appendChild(row);
    });

    const tableWrapper = this.createElement('div', 'table-responsive');
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    return container;
  }

  renderRaceBreakdown(comparison, container) {
    const section = this.createElement('section', 'race-breakdown');
    const heading = this.createElement('h2', 'section-heading', 'Race-by-Race Breakdown');
    section.appendChild(heading);

    if (comparison.raceComparisons.length === 0) {
      const noRaces = this.createElement('p', 'no-data', 'No completed races yet.');
      section.appendChild(noRaces);
      container.appendChild(section);
      return;
    }

    const table = this.createElement('table', 'race-breakdown-table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Round</th>
          <th>Grand Prix</th>
          <th>${comparison.player1.name}</th>
          <th>${comparison.player2.name}</th>
          <th>Winner</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    comparison.raceComparisons.forEach(race => {
      const raceData = dataStore.getRace(race.raceId);
      const winner = race.winner === 'tie' ? 'Tie' :
        race.winner === comparison.player1.playerId ? comparison.player1.name : comparison.player2.name;

      const margin = race.winner === 'tie' ? '' : `(+${race.margin})`;
      const raceName = (race.raceName || 'Race').replace(' Grand Prix', ' GP');

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="round">${raceData ? raceData.round : '?'}</td>
        <td class="race-name">
          <a href="#/race/${race.raceId}">${raceName}</a>
        </td>
        <td class="score ${race.winner === comparison.player1.playerId ? 'winner' : ''}">
          ${race.player1Total}
        </td>
        <td class="score ${race.winner === comparison.player2.playerId ? 'winner' : ''}">
          ${race.player2Total}
        </td>
        <td class="winner-cell">${winner} ${margin}</td>
      `;

      tbody.appendChild(row);
    });

    const tableWrapper = this.createElement('div', 'table-responsive');
    tableWrapper.appendChild(table);
    section.appendChild(tableWrapper);
    container.appendChild(section);
  }

  renderPointsTrend(comparison, container) {
    const section = this.createElement('section', 'points-trend');
    const heading = this.createElement('h2', 'section-heading', 'Points Trend');
    section.appendChild(heading);

    if (comparison.raceComparisons.length === 0) {
      const noData = this.createElement('p', 'no-data', 'No race data yet.');
      section.appendChild(noData);
      container.appendChild(section);
      return;
    }

    // Calculate cumulative totals per race
    let p1Cumulative = 0;
    let p2Cumulative = 0;

    const chartData = comparison.raceComparisons.map(race => {
      p1Cumulative += race.player1Total;
      p2Cumulative += race.player2Total;

      return {
        raceId: race.raceId,
        raceName: race.raceName,
        player1: p1Cumulative,
        player2: p2Cumulative
      };
    });

    // Create canvas for Chart.js
    const canvasContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'pointsTrendChart';
    canvasContainer.appendChild(canvas);
    section.appendChild(canvasContainer);

    // Render chart after canvas is in DOM
    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      
      // Player colors
      const player1Color = '#0EA5E9'; // Blue
      const player2Color = '#F97316'; // Orange
      
      const chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.map(d => (d.raceName || 'Race').replace(' Grand Prix', '')),
          datasets: [
            {
              label: comparison.player1.name,
              data: chartData.map(d => d.player1),
              borderColor: player1Color,
              backgroundColor: player1Color + '33',
              borderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: player1Color,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.3,
              fill: false,
              playerId: 1,
              originalColor: player1Color,
              originalBorderWidth: 3,
              originalPointRadius: 5
            },
            {
              label: comparison.player2.name,
              data: chartData.map(d => d.player2),
              borderColor: player2Color,
              backgroundColor: player2Color + '33',
              borderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 7,
              pointBackgroundColor: player2Color,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.3,
              fill: false,
              playerId: 2,
              originalColor: player2Color,
              originalBorderWidth: 3,
              originalPointRadius: 5
            }
          ]
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
                font: {
                  size: 14,
                  weight: 'bold'
                },
                padding: 15,
                usePointStyle: true
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  const otherValue = context.chart.data.datasets[1 - context.datasetIndex].data[context.dataIndex];
                  const gap = Math.abs(value - otherValue);
                  const leader = value > otherValue ? '(Leading by ' + gap + ')' : '(Behind by ' + gap + ')';
                  return label + ': ' + value + ' points ' + leader;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: {
                  size: 12
                }
              },
              title: {
                display: true,
                text: 'Cumulative Points',
                font: {
                  size: 13,
                  weight: 'bold'
                }
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          },
          onClick: (event, activeElements, chart) => {
            if (activeElements.length > 0) {
              const datasetIndex = activeElements[0].datasetIndex;
              const playerId = chart.data.datasets[datasetIndex].playerId;
              this.togglePlayerHighlight(playerId, chart);
            }
          }
        }
      });
      
      // Store chart instance for cleanup
      this.chartInstances.set('points-trend', chart);
    }, 100);

    container.appendChild(section);
  }

  renderActions(container) {
    const actions = this.createElement('div', 'comparison-actions');

    const backBtn = this.createElement('button', 'btn-primary', 'Back to Draft');
    backBtn.addEventListener('click', () => {
      window.location.hash = '#/draft';
    });

    actions.appendChild(backBtn);

    container.appendChild(actions);
  }

  renderDriverStandingsTab(container) {
    const season = draftStore.currentSeason || 2026;
    
    // Get all driver season summaries for current season
    const driverStandings = dataStore.data.driverSeasonSummary
      .filter(d => d.season === season)
      .sort((a, b) => {
        if (a.position == null && b.position == null) return 0;
        if (a.position == null) return 1;
        if (b.position == null) return -1;
        return a.position - b.position;
      })
      .map(standing => {
        const driver = dataStore.indexes.driverById.get(standing.driverId);
        return { ...standing, ...driver };
      });

    if (driverStandings.length === 0) {
      const errorDiv = this.createElement('div', 'no-data');
      errorDiv.innerHTML = `
        <p>⚠️ No driver standings data available for ${season} season.</p>
        <p style="margin-top: 1rem; font-size: 0.9rem;">
          Current season: ${draftStore.currentSeason || 'Not set'}<br>
          DataStore season: ${dataStore.season}<br>
          Loaded: ${dataStore.loaded ? 'Yes' : 'No'}<br>
          Total standings in store: ${dataStore.data.driverSeasonSummary.length}
        </p>
      `;
      container.appendChild(errorDiv);
      return;
    }

    // Calculate additional stats from race results
    const driverStats = this.calculateDriverStats(season, driverStandings);

    // Render standings table
    this.renderDriverStandingsTable(container, driverStats);

    // Render championship progression charts
    this.renderDriverChampionshipCharts(container, season, driverStats);
  }

  calculateDriverStats(season, driverStandings) {
    return driverStandings.map(driver => {
      const driverId = driver.driverId;
      
      // Get all race results for this driver
      const raceResults = dataStore.data.raceResults.filter(r => 
        r.driverId === driverId && 
        dataStore.getRace(r.raceId)?.season === season
      );
      
      // Get qualifying results
      const qualifyingResults = dataStore.data.qualifying.filter(q => 
        q.driverId === driverId && 
        dataStore.getRace(q.raceId)?.season === season
      );

      // Calculate stats
      const podiums = raceResults.filter(r => r.position && r.position <= 3).length;
      const poles = qualifyingResults.filter(q => q.position === 1).length;
      const fastestLaps = raceResults.filter(r => r.fastestLapRank === 1 || r.fastestLapRank === '1').length;

      return {
        ...driver,
        podiums,
        poles,
        fastestLaps
      };
    });
  }

  renderDriverStandingsTable(container, driverStats) {
    const section = this.createElement('section', 'standings-section');
    const heading = this.createElement('h2', 'section-heading', 'Driver Championship Standings');
    section.appendChild(heading);

    const tableContainer = this.createElement('div', 'standings-table-container');
    const table = this.createElement('table', 'standings-table');
    
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th>Points</th>
          <th>Wins</th>
          <th>Podiums</th>
          <th>Poles</th>
          <th>FL</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    driverStats.forEach((driver, idx) => {
      const row = document.createElement('tr');
      row.classList.add('standings-row');
      row.dataset.driverId = driver.driverId;
      row.dataset.entityType = 'driver';

      // Get constructor for team color
      const constructor = dataStore.indexes.constructorById.get(driver.constructorId);
      const teamColor = constructor?.teamColor || '#888';
      const displayPos = driver.position ?? (idx + 1);

      row.innerHTML = `
        <td class="position-cell">
          <span class="position-badge" style="background: ${teamColor}">P${displayPos}</span>
        </td>
        <td class="driver-cell">
          <img src="${driver.photoUrl}" alt="" aria-hidden="true" class="driver-photo-small" onerror="this.style.display='none'">
          <a href="#/driver/${driver.driverId}" class="driver-name-link">${driver.name}</a>
        </td>
        <td class="team-cell">
          <a href="#/constructor/${driver.constructorId}">${constructor?.name || driver.constructorId}</a>
        </td>
        <td class="points-cell">${driver.points}</td>
        <td class="wins-cell">${driver.wins}</td>
        <td class="podiums-cell">${driver.podiums}</td>
        <td class="poles-cell">${driver.poles}</td>
        <td class="fl-cell">${driver.fastestLaps}</td>
      `;

      // Add click handler for interactive highlighting
      row.addEventListener('click', () => {
        this.toggleEntityHighlight(driver.driverId, 'driver');
      });

      tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
    section.appendChild(tableContainer);
    container.appendChild(section);
  }

  renderConstructorStandingsTab(container) {
    const season = draftStore.currentSeason || 2026;
    
    // Get all constructor season summaries for current season
    const constructorStandings = dataStore.data.constructorSeasonSummary
      .filter(c => c.season === season)
      .sort((a, b) => {
        if (a.position == null && b.position == null) return 0;
        if (a.position == null) return 1;
        if (b.position == null) return -1;
        return a.position - b.position;
      })
      .map(standing => {
        const constructor = dataStore.indexes.constructorById.get(standing.constructorId);
        return { ...standing, ...constructor };
      });

    if (constructorStandings.length === 0) {
      container.appendChild(
        this.createErrorMessage('No constructor standings data available for this season.')
      );
      return;
    }

    // Calculate additional stats
    const constructorStats = this.calculateConstructorStats(season, constructorStandings);

    // Render standings table
    this.renderConstructorStandingsTable(container, constructorStats);

    // Render championship progression charts
    this.renderConstructorChampionshipCharts(container, season, constructorStats);
  }

  calculateConstructorStats(season, constructorStandings) {
    return constructorStandings.map(constructor => {
      const constructorId = constructor.constructorId;
      
      // Get all race results for this constructor
      const raceResults = dataStore.data.raceResults.filter(r => {
        const driver = dataStore.indexes.driverById.get(r.driverId);
        const race = dataStore.getRace(r.raceId);
        return driver?.constructorId === constructorId && race?.season === season;
      });

      // Calculate podiums
      const podiums = raceResults.filter(r => r.position && r.position <= 3).length;

      // Get drivers for this constructor from driver standings
      const driversFromStandings = dataStore.data.driverSeasonSummary
        .filter(d => d.season === season && d.constructorId === constructorId)
        .map(d => {
          const driverData = dataStore.indexes.driverById.get(d.driverId);
          return driverData ? (driverData.code || driverData.name) : d.driverId;
        });
      
      // If no drivers from standings, try getting from drivers list directly
      const driversFromDriversList = driversFromStandings.length === 0 
        ? dataStore.data.drivers
            .filter(d => d.constructorId === constructorId)
            .map(d => d.code || d.name)
        : [];
      
      const allDrivers = driversFromStandings.length > 0 ? driversFromStandings : driversFromDriversList;
      const drivers = allDrivers.length > 0 ? allDrivers.join(', ') : 'N/A';

      return {
        ...constructor,
        podiums,
        drivers
      };
    });
  }

  renderConstructorStandingsTable(container, constructorStats) {
    const section = this.createElement('section', 'standings-section');
    const heading = this.createElement('h2', 'section-heading', 'Constructor Championship Standings');
    section.appendChild(heading);

    const tableContainer = this.createElement('div', 'standings-table-container');
    const table = this.createElement('table', 'standings-table');
    
    table.innerHTML = `
      <thead>
        <tr>
          <th class="th-center">Pos</th>
          <th class="th-logo"></th>
          <th>Team</th>
          <th>Drivers</th>
          <th class="th-center">Points</th>
          <th class="th-center">Wins</th>
          <th class="th-center">Podiums</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;

    const tbody = table.querySelector('tbody');

    constructorStats.forEach((constructor, idx) => {
      const row = document.createElement('tr');
      row.classList.add('standings-row');
      row.dataset.constructorId = constructor.constructorId;
      row.dataset.entityType = 'constructor';

      const teamColor = constructor.teamColor || '#888';
      const displayPos = constructor.position ?? (idx + 1);

      row.innerHTML = `
        <td class="position-cell">
          <span class="position-badge" style="background: ${teamColor}">P${displayPos}</span>
        </td>
        <td class="logo-cell">
          <img src="${dataStore.getConstructorLogoUrl(constructor.constructorId)}" 
               alt="${constructor.name}" 
               class="constructor-logo-small" 
               onerror="this.style.display='none'">
        </td>
        <td class="team-name-cell">
          <a href="#/constructor/${constructor.constructorId}" class="constructor-name-link">${constructor.name}</a>
        </td>
        <td class="drivers-cell">${constructor.drivers || 'N/A'}</td>
        <td class="points-cell">${constructor.points}</td>
        <td class="wins-cell">${constructor.wins}</td>
        <td class="podiums-cell">${constructor.podiums}</td>
      `;

      // Add click handler for interactive highlighting
      row.addEventListener('click', () => {
        this.toggleEntityHighlight(constructor.constructorId, 'constructor');
      });

      tbody.appendChild(row);
    });

    tableContainer.appendChild(table);
    section.appendChild(tableContainer);
    container.appendChild(section);
  }

  renderDriverChampionshipCharts(container, season, driverStats) {
    // Get all races for the season
    const races = dataStore.data.races
      .filter(r => r.season === season)
      .sort((a, b) => a.round - b.round);

    if (races.length === 0) {
      const noDataMessage = this.createElement('p', 'no-data', 
        `No race data available for the ${season} season yet. Championship progression will display once races begin.`);
      container.appendChild(noDataMessage);
      return;
    }

    // Filter to only races that have results
    const racesWithResults = races.filter(r => {
      const results = dataStore.getRaceResults(r.raceId);
      return results && results.length > 0;
    });

    if (racesWithResults.length === 0) {
      const noDataMessage = this.createElement('p', 'no-data', 
        `The ${season} season has ${races.length} scheduled race${races.length !== 1 ? 's' : ''}, but no race results are available yet. 
        Championship progression will display once race results are available.`);
      container.appendChild(noDataMessage);
      return;
    }

    // Prepare data for charts using only races with results
    const driverProgressionData = this.calculateDriverProgression(season, racesWithResults, driverStats);

    // Render rank progression chart
    this.renderDriverRankChart(container, racesWithResults, driverProgressionData, driverStats);

    // Render points progression chart
    this.renderDriverPointsChart(container, racesWithResults, driverProgressionData, driverStats);
  }

  calculateDriverProgression(season, races, driverStats) {
    const driverProgressionData = new Map();

    // Group drivers by team to assign unique colors
    const teamDrivers = new Map();
    driverStats.forEach(driver => {
      if (!teamDrivers.has(driver.constructorId)) {
        teamDrivers.set(driver.constructorId, []);
      }
      teamDrivers.get(driver.constructorId).push(driver);
    });

    driverStats.forEach(driver => {
      const constructor = dataStore.indexes.constructorById.get(driver.constructorId);
      const teamColor = constructor?.teamColor || '#888';
      
      // Get driver index within their team (0 or 1)
      const teamDriverList = teamDrivers.get(driver.constructorId);
      const driverIndex = teamDriverList.indexOf(driver);
      
      // Generate unique color for this driver
      const driverColor = this.getDriverColor(teamColor, driverIndex);

      driverProgressionData.set(driver.driverId, {
        rankData: [],
        pointsData: [],
        name: driver.name,
        code: driver.code,
        color: driverColor
      });
    });

    // Calculate cumulative points and ranks per round
    races.forEach(race => {
      const raceResults = dataStore.getRaceResults(race.raceId);
      const sprintResults = dataStore.getSprintResults(race.raceId);
      
      // Create a map of points earned in this race (race + sprint)
      const racePointsMap = new Map();
      raceResults.forEach(result => {
        racePointsMap.set(result.driverId, parseFloat(result.points) || 0);
      });
      sprintResults.forEach(result => {
        const existing = racePointsMap.get(result.driverId) || 0;
        racePointsMap.set(result.driverId, existing + (parseFloat(result.points) || 0));
      });

      // Update cumulative points for ALL drivers (even those not in this race)
      driverProgressionData.forEach((driverData, driverId) => {
        const currentPoints = driverData.pointsData.length > 0
          ? driverData.pointsData[driverData.pointsData.length - 1]
          : 0;
        const racePoints = racePointsMap.get(driverId) || 0;
        driverData.pointsData.push(currentPoints + racePoints);
      });

      // Calculate ranks based on cumulative points
      const standings = Array.from(driverProgressionData.entries())
        .map(([driverId, data]) => ({
          driverId,
          points: data.pointsData[data.pointsData.length - 1] || 0
        }))
        .sort((a, b) => b.points - a.points);

      standings.forEach((standing, index) => {
        const driverData = driverProgressionData.get(standing.driverId);
        driverData.rankData.push(index + 1);
      });
    });

    return driverProgressionData;
  }

  renderDriverRankChart(container, races, progressionData, driverStats) {
    const section = this.createElement('section', 'rank-progression');
    const heading = this.createElement('h2', 'section-heading', 'Championship Position Progression');
    section.appendChild(heading);

    const chartContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'driverRankChart';
    chartContainer.appendChild(canvas);
    section.appendChild(chartContainer);

    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      const raceLabels = races.map(r => r.raceName.replace(' Grand Prix', ''));

      const datasets = [];
      progressionData.forEach((data, driverId) => {
        // Only add dataset if it has data points
        if (data.rankData && data.rankData.length > 0) {
          datasets.push({
            label: data.code || data.name,
            data: data.rankData,
            borderColor: data.color + 'AA',
            backgroundColor: data.color + '33',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: data.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            tension: 0.2,
            fill: false,
            entityId: driverId,
            originalColor: data.color
          });
        }
      });

      // Check if we have any valid datasets
      if (datasets.length === 0) {
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'no-data';
        noDataMsg.textContent = 'No progression data available to display.';
        chartContainer.appendChild(noDataMsg);
        return;
      }

      const chart = new Chart(ctx, {
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
              display: false
            },
            tooltip: {
              mode: 'nearest',
              intersect: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: P${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              reverse: true,
              beginAtZero: false,
              min: 1,
              max: Math.max(...driverStats.map(d => d.position)),
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: { size: 12 },
                callback: function(value) {
                  return 'P' + value;
                }
              },
              title: {
                display: true,
                text: 'Championship Position',
                font: { size: 13, weight: 'bold' }
              }
            }
          },
          onClick: (event, activeElements, chart) => {
            if (activeElements.length > 0) {
              const datasetIndex = activeElements[0].datasetIndex;
              const entityId = chart.data.datasets[datasetIndex].entityId;
              this.toggleEntityHighlight(entityId, 'driver');
            }
          }
        }
      });

      this.chartInstances.set('driver-rank-chart', chart);
    }, 100);

    container.appendChild(section);
  }

  renderDriverPointsChart(container, races, progressionData, driverStats) {
    const section = this.createElement('section', 'points-progression');
    const heading = this.createElement('h2', 'section-heading', 'Cumulative Points Progression');
    section.appendChild(heading);

    const chartContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'driverPointsChart';
    chartContainer.appendChild(canvas);
    section.appendChild(chartContainer);

    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      const raceLabels = races.map(r => r.raceName.replace(' Grand Prix', ''));

      const datasets = [];
      progressionData.forEach((data, driverId) => {
        // Only add dataset if it has data points
        if (data.pointsData && data.pointsData.length > 0) {
          datasets.push({
            label: data.code || data.name,
            data: data.pointsData.map(p => Math.max(p, 1)),
            borderColor: data.color + 'AA',
            backgroundColor: data.color + '33',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: data.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            tension: 0.2,
            fill: false,
            entityId: driverId,
            originalColor: data.color
          });
        }
      });

      // Check if we have any valid datasets
      if (datasets.length === 0) {
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'no-data';
        noDataMsg.textContent = 'No progression data available to display.';
        chartContainer.appendChild(noDataMsg);
        return;
      }

      const chart = new Chart(ctx, {
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
              display: false
            },
            tooltip: {
              mode: 'nearest',
              intersect: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y} points`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              type: 'logarithmic',
              min: 1,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: { size: 12 },
                callback: function(value) {
                  if (value === 1 || value === 10 || value === 100 || value === 1000) {
                    return value;
                  }
                  if (value === 5 || value === 50 || value === 500) {
                    return value;
                  }
                  return '';
                }
              },
              title: {
                display: true,
                text: 'Cumulative Points (Log Scale)',
                font: { size: 13, weight: 'bold' }
              }
            }
          }
        }
      });

      this.chartInstances.set('driver-points-chart', chart);
    }, 100);

    container.appendChild(section);
  }

  renderConstructorChampionshipCharts(container, season, constructorStats) {
    // Get all races for the season
    const races = dataStore.data.races
      .filter(r => r.season === season)
      .sort((a, b) => a.round - b.round);

    if (races.length === 0) {
      const noDataMessage = this.createElement('p', 'no-data', 
        `No race data available for the ${season} season yet. Championship progression will display once races begin.`);
      container.appendChild(noDataMessage);
      return;
    }

    // Filter to only races that have results
    const racesWithResults = races.filter(r => {
      const results = dataStore.getRaceResults(r.raceId);
      return results && results.length > 0;
    });

    if (racesWithResults.length === 0) {
      const noDataMessage = this.createElement('p', 'no-data', 
        `The ${season} season has ${races.length} scheduled race${races.length !== 1 ? 's' : ''}, but no race results are available yet. 
        Championship progression will display once race results are available.`);
      container.appendChild(noDataMessage);
      return;
    }

    // Prepare data for charts using only races with results
    const constructorProgressionData = this.calculateConstructorProgression(season, racesWithResults, constructorStats);

    // Render rank progression chart
    this.renderConstructorRankChart(container, racesWithResults, constructorProgressionData, constructorStats);

    // Render points progression chart
    this.renderConstructorPointsChart(container, racesWithResults, constructorProgressionData, constructorStats);
  }

  calculateConstructorProgression(season, races, constructorStats) {
    const constructorProgressionData = new Map();

    constructorStats.forEach(constructor => {
      constructorProgressionData.set(constructor.constructorId, {
        rankData: [],
        pointsData: [],
        name: constructor.name,
        color: constructor.teamColor || '#888'
      });
    });

    // Calculate cumulative points and ranks per round
    races.forEach(race => {
      const raceResults = dataStore.getRaceResults(race.raceId);
      const sprintResults = dataStore.getSprintResults(race.raceId);
      
      // Aggregate points per constructor for this race (race + sprint)
      const constructorRacePoints = new Map();
      raceResults.forEach(result => {
        const driver = dataStore.indexes.driverById.get(result.driverId);
        if (driver && constructorProgressionData.has(driver.constructorId)) {
          const current = constructorRacePoints.get(driver.constructorId) || 0;
          constructorRacePoints.set(driver.constructorId, current + (parseFloat(result.points) || 0));
        }
      });
      sprintResults.forEach(result => {
        const driver = dataStore.indexes.driverById.get(result.driverId);
        if (driver && constructorProgressionData.has(driver.constructorId)) {
          const current = constructorRacePoints.get(driver.constructorId) || 0;
          constructorRacePoints.set(driver.constructorId, current + (parseFloat(result.points) || 0));
        }
      });

      // Update cumulative points
      constructorProgressionData.forEach((data, constructorId) => {
        const currentPoints = data.pointsData.length > 0
          ? data.pointsData[data.pointsData.length - 1]
          : 0;
        const racePoints = constructorRacePoints.get(constructorId) || 0;
        data.pointsData.push(currentPoints + racePoints);
      });

      // Calculate ranks based on cumulative points
      const standings = Array.from(constructorProgressionData.entries())
        .map(([constructorId, data]) => ({
          constructorId,
          points: data.pointsData[data.pointsData.length - 1] || 0
        }))
        .sort((a, b) => b.points - a.points);

      standings.forEach((standing, index) => {
        const constructorData = constructorProgressionData.get(standing.constructorId);
        constructorData.rankData.push(index + 1);
      });
    });

    return constructorProgressionData;
  }

  renderConstructorRankChart(container, races, progressionData, constructorStats) {
    const section = this.createElement('section', 'rank-progression');
    const heading = this.createElement('h2', 'section-heading', 'Championship Position Progression');
    section.appendChild(heading);

    const chartContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'constructorRankChart';
    chartContainer.appendChild(canvas);
    section.appendChild(chartContainer);

    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      const raceLabels = races.map(r => r.raceName.replace(' Grand Prix', ''));

      const datasets = [];
      progressionData.forEach((data, constructorId) => {
        // Only add dataset if it has data points
        if (data.rankData && data.rankData.length > 0) {
          datasets.push({
            label: data.name,
            data: data.rankData,
            borderColor: data.color + 'AA',
            backgroundColor: data.color + '33',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: data.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            tension: 0.2,
            fill: false,
            entityId: constructorId,
            originalColor: data.color
          });
        }
      });

      // Check if we have any valid datasets
      if (datasets.length === 0) {
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'no-data';
        noDataMsg.textContent = 'No progression data available to display.';
        chartContainer.appendChild(noDataMsg);
        return;
      }

      const chart = new Chart(ctx, {
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
              display: false
            },
            tooltip: {
              mode: 'nearest',
              intersect: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: P${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              reverse: true,
              beginAtZero: false,
              min: 1,
              max: Math.max(...constructorStats.map(c => c.position)),
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: { size: 12 },
                callback: function(value) {
                  return 'P' + value;
                }
              },
              title: {
                display: true,
                text: 'Championship Position',
                font: { size: 13, weight: 'bold' }
              }
            }
          },
          onClick: (event, activeElements, chart) => {
            if (activeElements.length > 0) {
              const datasetIndex = activeElements[0].datasetIndex;
              const entityId = chart.data.datasets[datasetIndex].entityId;
              this.toggleEntityHighlight(entityId, 'constructor');
            }
          }
        }
      });

      this.chartInstances.set('constructor-rank-chart', chart);
    }, 100);

    container.appendChild(section);
  }

  renderConstructorPointsChart(container, races, progressionData, constructorStats) {
    const section = this.createElement('section', 'points-progression');
    const heading = this.createElement('h2', 'section-heading', 'Cumulative Points Progression');
    section.appendChild(heading);

    const chartContainer = this.createElement('div', 'chart-container');
    const canvas = document.createElement('canvas');
    canvas.id = 'constructorPointsChart';
    chartContainer.appendChild(canvas);
    section.appendChild(chartContainer);

    setTimeout(() => {
      const ctx = canvas.getContext('2d');
      const raceLabels = races.map(r => r.raceName.replace(' Grand Prix', ''));

      const datasets = [];
      progressionData.forEach((data, constructorId) => {
        // Only add dataset if it has data points
        if (data.pointsData && data.pointsData.length > 0) {
          datasets.push({
            label: data.name,
            data: data.pointsData.map(p => Math.max(p, 1)),
            borderColor: data.color + 'AA',
            backgroundColor: data.color + '33',
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: data.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            tension: 0.2,
            fill: false,
            entityId: constructorId,
            originalColor: data.color
          });
        }
      });

      // Check if we have any valid datasets
      if (datasets.length === 0) {
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'no-data';
        noDataMsg.textContent = 'No progression data available to display.';
        chartContainer.appendChild(noDataMsg);
        return;
      }

      const chart = new Chart(ctx, {
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
              display: false
            },
            tooltip: {
              mode: 'nearest',
              intersect: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y} points`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 },
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              type: 'logarithmic',
              min: 1,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              ticks: {
                font: { size: 12 },
                callback: function(value) {
                  if (value === 1 || value === 10 || value === 100 || value === 1000) {
                    return value;
                  }
                  if (value === 5 || value === 50 || value === 500) {
                    return value;
                  }
                  return '';
                }
              },
              title: {
                display: true,
                text: 'Cumulative Points (Log Scale)',
                font: { size: 13, weight: 'bold' }
              }
            }
          },
          onClick: (event, activeElements, chart) => {
            if (activeElements.length > 0) {
              const datasetIndex = activeElements[0].datasetIndex;
              const entityId = chart.data.datasets[datasetIndex].entityId;
              this.toggleEntityHighlight(entityId, 'constructor');
            }
          }
        }
      });

      this.chartInstances.set('constructor-points-chart', chart);
    }, 100);

    container.appendChild(section);
  }

  toggleEntityHighlight(entityId, entityType) {
    // Toggle highlighting
    if (this.highlightedEntity?.id === entityId && this.highlightedEntity?.type === entityType) {
      // Deselect
      this.highlightedEntity = null;
      document.querySelectorAll('.standings-row').forEach(r => r.classList.remove('highlighted'));
    } else {
      // Select new entity
      this.highlightedEntity = { id: entityId, type: entityType };
      document.querySelectorAll('.standings-row').forEach(r => r.classList.remove('highlighted'));
      document.querySelector(`.standings-row[data-${entityType}-id="${entityId}"]`)?.classList.add('highlighted');
    }

    // Update charts
    const chartKeys = entityType === 'driver' 
      ? ['driver-rank-chart', 'driver-points-chart']
      : ['constructor-rank-chart', 'constructor-points-chart'];

    chartKeys.forEach(key => {
      const chart = this.chartInstances.get(key);
      if (chart) {
        if (this.highlightedEntity) {
          this.highlightEntityInChart(chart, entityId);
        } else {
          this.resetChartHighlights(chart);
        }
      }
    });
  }

  highlightEntityInChart(chartInstance, entityId) {
    // Update dataset styles to highlight the selected entity
    chartInstance.data.datasets.forEach((dataset, index) => {
      const isHighlighted = dataset.entityId === entityId;
      
      if (isHighlighted) {
        dataset.borderWidth = 4;
        dataset.pointRadius = 6;
        dataset.borderColor = dataset.originalColor;
        dataset.backgroundColor = dataset.originalColor + '66';
        dataset.hidden = false;
      } else {
        dataset.borderWidth = 1.5;
        dataset.pointRadius = 2;
        dataset.borderColor = 'rgba(160, 160, 160, 0.3)';
        dataset.backgroundColor = 'rgba(160, 160, 160, 0.1)';
      }
    });

    chartInstance.update('none'); // Update without animation
  }

  resetChartHighlights(chartInstance) {
    // Reset all datasets to equal weight
    chartInstance.data.datasets.forEach(dataset => {
      dataset.borderWidth = 2;
      dataset.pointRadius = 4;
      dataset.borderColor = dataset.originalColor + 'AA';
      dataset.backgroundColor = dataset.originalColor + '33';
      dataset.hidden = false;
    });

    chartInstance.update('none');
  }

  togglePlayerHighlight(playerId, chartInstance) {
    // Toggle highlighting for comparison chart
    if (this.highlightedPlayer === playerId) {
      // Deselect - reset all lines
      this.highlightedPlayer = null;
      chartInstance.data.datasets.forEach(dataset => {
        dataset.borderWidth = dataset.originalBorderWidth || 3;
        dataset.pointRadius = dataset.originalPointRadius || 5;
        dataset.borderColor = dataset.originalColor;
        dataset.backgroundColor = dataset.originalColor + '33';
      });
    } else {
      // Select new player - fade others, bold selected
      this.highlightedPlayer = playerId;
      chartInstance.data.datasets.forEach(dataset => {
        const isHighlighted = dataset.playerId === playerId;
        
        if (isHighlighted) {
          // Bold the selected line
          dataset.borderWidth = 5;
          dataset.pointRadius = 7;
          dataset.borderColor = dataset.originalColor;
          dataset.backgroundColor = dataset.originalColor + '66';
        } else {
          // Fade the other line
          dataset.borderWidth = 2;
          dataset.pointRadius = 3;
          dataset.borderColor = 'rgba(160, 160, 160, 0.4)';
          dataset.backgroundColor = 'rgba(160, 160, 160, 0.1)';
        }
      });
    }

    chartInstance.update('none'); // Update without animation
  }

  handleExport() {
    const draft = draftStore.draft;
    const [player1, player2] = draft.players;
    const comparison = fantasyTeamScorer.compareTeams(
      player1.playerId,
      player2.playerId,
      draftStore,
      dataStore
    );

    const exportData = {
      season: draft.season,
      players: [
        {
          name: player1.name,
          totalPoints: comparison.player1.totalPoints,
          raceWins: comparison.player1.raceWins,
          drivers: comparison.player1.drivers
        },
        {
          name: player2.name,
          totalPoints: comparison.player2.totalPoints,
          raceWins: comparison.player2.raceWins,
          drivers: comparison.player2.drivers
        }
      ],
      races: comparison.raceComparisons
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy_league_${draft.season}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
}
