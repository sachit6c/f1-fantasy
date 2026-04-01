// views/calendar-view.js
// Calendar view showing all races in the season

import { BaseView } from './base-view.js';
import { dataStore } from '../lib/data-store.js';
import { draftStore } from '../lib/draft-store.js';

export class CalendarView extends BaseView {
  constructor() {
    super();
    this.viewMode = 'grid'; // 'grid' or 'week'
  }

  async render(container, params) {
    this.root = container;

    try {
      // Clean up existing Leaflet map before re-rendering
      if (this._leafletMap) {
        this._leafletMap.remove();
        this._leafletMap = null;
      }

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

      // Race calendar
      this.renderCalendar();
    } catch (error) {
      console.error('[CalendarView] Error rendering calendar:', error);
      this.root.innerHTML = `
        <div class="error-message" style="padding: 2rem; text-align: center;">
          <p style="color: red; font-size: 1.5rem;">⚠️ Error loading calendar</p>
          <p>${error.message}</p>
          <pre style="text-align: left; background: #f5f5f5; padding: 1rem; margin-top: 1rem; overflow: auto;">${error.stack}</pre>
        </div>
      `;
    }
  }

  renderHeader() {
    const header = this.createElement('div', 'calendar-header');

    const title = this.createElement('h1', 'page-title', 'Race Calendar');
    header.appendChild(title);

    const subtitle = this.createElement('p', 'page-subtitle', `${dataStore.season} Formula 1 Season`);
    header.appendChild(subtitle);

    // View mode switcher
    const viewSwitcher = this.createElement('div', 'view-switcher');
    
    const svgGrid = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
    const svgWeek = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;

    const gridBtn = this.createElement('button', ['view-btn', this.viewMode === 'grid' ? 'active' : '']);
    gridBtn.innerHTML = `<span class="tab-icon">${svgGrid}</span><span>Grid View</span>`;
    gridBtn.addEventListener('click', () => {
      this.viewMode = 'grid';
      this.render(this.root, {});
    });

    const weekBtn = this.createElement('button', ['view-btn', this.viewMode === 'week' ? 'active' : '']);
    weekBtn.innerHTML = `<span class="tab-icon">${svgWeek}</span><span>Week View</span>`;
    weekBtn.addEventListener('click', () => {
      this.viewMode = 'week';
      this.render(this.root, {});
    });
    
    viewSwitcher.appendChild(gridBtn);
    viewSwitcher.appendChild(weekBtn);
    header.appendChild(viewSwitcher);

    this.root.appendChild(header);
  }

  renderCalendar() {
    const races = dataStore.data.races;
    


    if (!races || races.length === 0) {
      const emptyMessage = this.createElement('div', 'empty-state');
      emptyMessage.style.cssText = 'padding: var(--spacing-xl); text-align: center; background: var(--color-bg-card); border-radius: var(--radius-lg); margin: var(--spacing-lg);';
      emptyMessage.innerHTML = `
        <p style="font-size: 1.5rem; color: #666;">No race data available for ${dataStore.season} season</p>
        <p style="margin-top: 1rem; color: #999;">Please check that races_${dataStore.season}.csv exists in data/canonical/</p>
      `;
      this.root.appendChild(emptyMessage);
      return;
    }

    // Render world map
    this.renderWorldMap(races);

    if (this.viewMode === 'week') {
      this.renderWeekView(races);
    } else {
      this.renderGridView(races);
    }
  }

  renderWorldMap(races) {
    const mapContainer = this.createElement('div', 'world-map-container');

    const mapHeader = this.createElement('h2', 'world-map-title', '🌍 Race Locations Around the World');
    mapContainer.appendChild(mapHeader);

    const mapWrapper = this.createElement('div', 'world-map-wrapper');
    const mapEl = this.createElement('div', 'world-map-leaflet');
    mapWrapper.appendChild(mapEl);
    mapContainer.appendChild(mapWrapper);
    this.root.appendChild(mapContainer);

    // Leaflet must initialize after the element is in the DOM
    requestAnimationFrame(() => this._initLeafletMap(mapEl, races));
  }

  _initLeafletMap(mapEl, races) {
    if (typeof L === 'undefined') {
      console.error('[CalendarView] Leaflet (L) is not loaded. Check CDN script in index.html.');
      mapEl.style.cssText = 'display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:#888;font-size:var(--font-size-sm);';
      mapEl.textContent = 'Map unavailable — could not load mapping library.';
      return;
    }

    const map = L.map(mapEl, {
      center: [25, 15],
      zoom: 2,
      minZoom: 1,
      maxZoom: 10,
      zoomControl: true,
      scrollWheelZoom: false,
      worldCopyJump: true,
    });
    this._leafletMap = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Ensure the map fills its container correctly after layout
    setTimeout(() => map.invalidateSize(), 100);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the round number of the next upcoming race
    const nextRace = races
      .filter(r => r.date)
      .map(r => ({ ...r, _d: new Date(new Date(r.date).setHours(0, 0, 0, 0)) }))
      .filter(r => r._d >= today)
      .sort((a, b) => a._d - b._d)[0];
    const nextRound = nextRace ? nextRace.round : null;

    races.forEach(race => {
      const hasLat = race.lat && String(race.lat).trim() !== '';
      const hasLong = race.long && String(race.long).trim() !== '';
      if (!hasLat || !hasLong) return;

      const lat = parseFloat(race.lat);
      const lng = parseFloat(race.long);
      if (isNaN(lat) || isNaN(lng)) return;

      const raceDateOnly = new Date(race.date);
      raceDateOnly.setHours(0, 0, 0, 0);
      const isCompleted = raceDateOnly < today;
      const isNext = !isCompleted && String(race.round) === String(nextRound);

      const markerClass = isCompleted
        ? 'lf-marker lf-marker--done'
        : isNext
        ? 'lf-marker lf-marker--next'
        : 'lf-marker';

      const icon = L.divIcon({
        html: `<div class="${markerClass}">${race.round}</div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
      });

      const dateStr = new Date(race.date).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const statusLabel = isCompleted
        ? '<span class="lf-status lf-status--done">✓ Completed</span>'
        : isNext
        ? '<span class="lf-status lf-status--next">▶ Next Race</span>'
        : '<span class="lf-status lf-status--upcoming">→ Upcoming</span>';

      const popupHtml = `
        <div class="lf-popup">
          <div class="lf-popup-header">
            <span class="lf-popup-round">Round ${race.round}</span>
            ${statusLabel}
          </div>
          <div class="lf-popup-name">${race.raceName}</div>
          <div class="lf-popup-detail">🏁 ${race.circuitName}</div>
          <div class="lf-popup-detail">📍 ${race.locality}, ${race.country}</div>
          <div class="lf-popup-detail">📅 ${dateStr}</div>
          <a class="lf-popup-link" href="#/race/${race.raceId}">View Details →</a>
        </div>`;

      L.marker([lat, lng], { icon })
        .bindPopup(popupHtml, { maxWidth: 300, className: 'lf-popup-wrapper' })
        .addTo(map);
    });
  }


  renderGridView(races) {

    const calendarGrid = this.createElement('div', 'calendar-grid');

    races.forEach((race, index) => {
      const raceCard = this.createElement('div', 'race-card');

      // Make entire card clickable
      raceCard.style.cursor = 'pointer';
      raceCard.addEventListener('click', () => {
        window.location.hash = `#/race/${race.raceId}`;
      });

      // Round number
      const roundBadge = this.createElement('div', 'race-round-badge');
      roundBadge.textContent = `Round ${race.round}`;
      raceCard.appendChild(roundBadge);

      // Race name
      const raceName = this.createElement('h3', 'race-name');
      const raceLink = this.createElement('a');
      raceLink.href = `#/race/${race.raceId}`;
      raceLink.textContent = race.raceName;
      raceName.appendChild(raceLink);
      raceCard.appendChild(raceName);

      // Circuit name
      const circuitName = this.createElement('div', 'circuit-name', race.circuitName);
      raceCard.appendChild(circuitName);

      // Location
      const location = this.createElement('div', 'race-location');
      location.innerHTML = `📍 ${race.locality}, ${race.country}`;
      raceCard.appendChild(location);

      // Date
      const dateEl = this.createElement('div', 'race-date');
      const raceDate = new Date(race.date);
      dateEl.textContent = raceDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      raceCard.appendChild(dateEl);

      // Local time
      if (race.time) {
        const raceDateTime = new Date(`${race.date}T${race.time.replace('Z', '')}Z`);
        const timeEl = this.createElement('div', 'race-time');
        const localTime = raceDateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        });
        timeEl.innerHTML = `🕐 ${localTime} (local)`;
        raceCard.appendChild(timeEl);
      }

      // Status badge
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const raceDateOnly = new Date(race.date);
      raceDateOnly.setHours(0, 0, 0, 0);

      let status = '';
      let statusClass = '';
      if (race.hasResults || raceDateOnly < today) {
        status = 'Completed';
        statusClass = 'status-completed';
      } else if (raceDateOnly.getTime() === today.getTime()) {
        status = 'Today';
        statusClass = 'status-today';
      } else {
        status = 'Upcoming';
        statusClass = 'status-upcoming';
      }

      const statusBadge = this.createElement('div', ['race-status', statusClass], status);
      raceCard.appendChild(statusBadge);

      // Podium and fastest lap info (for races with results)
      if (race.hasResults) {
        const results = dataStore.getRaceResults(race.raceId);
        if (results && results.length > 0) {
          // Podium (top 3 finishers)
          const podiumResults = results
            .filter(r => r.position >= 1 && r.position <= 3)
            .sort((a, b) => a.position - b.position);

          if (podiumResults.length > 0) {
            const podiumEl = this.createElement('div', 'podium-info');
            
            podiumResults.forEach(result => {
              const driverData = dataStore.indexes.driverById.get(result.driverId);
              const podiumItem = this.createElement('div', 'podium-item');
              
              // Position badge with medals
              const medals = ['🥇', '🥈', '🥉'];
              const positionBadge = this.createElement('span', ['podium-position', `podium-p${result.position}`]);
              positionBadge.textContent = medals[result.position - 1];
              podiumItem.appendChild(positionBadge);
              
              // Driver link
              const driverLink = this.createElement('a', 'podium-driver');
              driverLink.href = `#/driver/${result.driverId}`;
              driverLink.textContent = driverData ? driverData.code : result.driverId;
              if (driverData && driverData.teamColor) {
                driverLink.style.color = driverData.teamColor;
              }
              podiumItem.appendChild(driverLink);
              
              podiumEl.appendChild(podiumItem);
            });
            
            raceCard.appendChild(podiumEl);
          }

          // Fastest lap
          const fastestLapDriver = results.find(r => r.fastestLapRank === 1);
          if (fastestLapDriver) {
            const driverData = dataStore.indexes.driverById.get(fastestLapDriver.driverId);
            const fastestLapEl = this.createElement('div', 'fastest-lap-info');
            fastestLapEl.innerHTML = `🟣 Fastest Lap: ${driverData ? driverData.code : fastestLapDriver.driverId} <span class="fastest-lap-bonus">+1</span>`;
            raceCard.appendChild(fastestLapEl);
          }
        }
      }

      calendarGrid.appendChild(raceCard);
    });

    this.root.appendChild(calendarGrid);
  }

  renderWeekView(races) {
    // Group races by week (using ISO week numbers)
    const getWeekNumber = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return { year: d.getFullYear(), week: weekNo };
    };

    const getWeekDate = (year, week) => {
      const simple = new Date(year, 0, 1 + (week - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      return ISOweekStart;
    };

    const weekGroups = new Map();
    
    races.forEach(race => {
      const { year, week } = getWeekNumber(race.date);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, {
          year,
          week,
          weekStart: getWeekDate(year, week),
          races: []
        });
      }
      
      weekGroups.get(weekKey).races.push(race);
    });

    // Get first and last race dates to determine season span
    const raceDates = races.map(r => new Date(r.date));
    const firstRaceDate = new Date(Math.min(...raceDates));
    const lastRaceDate = new Date(Math.max(...raceDates));
    
    const firstWeek = getWeekNumber(firstRaceDate);
    const lastWeek = getWeekNumber(lastRaceDate);
    
    // Generate all weeks from first to last race
    const allWeeks = [];
    let currentYear = firstWeek.year;
    let currentWeek = firstWeek.week;
    
    while (currentYear < lastWeek.year || (currentYear === lastWeek.year && currentWeek <= lastWeek.week)) {
      const weekKey = `${currentYear}-W${String(currentWeek).padStart(2, '0')}`;
      const weekStart = getWeekDate(currentYear, currentWeek);
      
      if (weekGroups.has(weekKey)) {
        allWeeks.push(weekGroups.get(weekKey));
      } else {
        // Add empty week
        allWeeks.push({
          year: currentYear,
          week: currentWeek,
          weekStart: weekStart,
          races: []
        });
      }
      
      // Move to next week
      currentWeek++;
      // Handle year transition (roughly 52-53 weeks per year)
      if (currentWeek > 52) {
        const nextYearFirstWeek = getWeekNumber(new Date(currentYear + 1, 0, 4));
        currentYear = nextYearFirstWeek.year;
        currentWeek = nextYearFirstWeek.week;
      }
    }
    
    const sortedWeeks = allWeeks;

    const weekContainer = this.createElement('div', 'week-view-container');
    
    // Get current date and week for highlighting
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentWeekInfo = getWeekNumber(today);

    sortedWeeks.forEach(weekData => {
      const isCurrentWeek = weekData.year === currentWeekInfo.year && weekData.week === currentWeekInfo.week;
      const weekSection = this.createElement('div', 'week-section');
      if (isCurrentWeek) {
        weekSection.classList.add('current-week');
      }
      if (weekData.races.length === 0) {
        weekSection.classList.add('no-race-week');
      }
      
      // Week header
      const weekHeader = this.createElement('div', 'week-header');
      const weekStartDate = weekData.weekStart.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const weekEndDate = new Date(weekData.weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEndStr = weekEndDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      const weekTitle = isCurrentWeek ? 
        `<h3 class="week-title">Week ${weekData.week} • ${weekStartDate} - ${weekEndStr} <span class="current-week-badge">📍 Current Week</span></h3>` :
        `<h3 class="week-title">Week ${weekData.week} • ${weekStartDate} - ${weekEndStr}</h3>`;
      
      const raceCountHtml = weekData.races.length > 1 ?
        `<span class="week-race-count">${weekData.races.length} races</span>` :
        weekData.races.length === 0 ? `<span class="week-race-count no-race">No Race</span>` : '';
      
      weekHeader.innerHTML = weekTitle + raceCountHtml;
      weekSection.appendChild(weekHeader);

      // Races in this week (or empty message)
      const weekRaces = this.createElement('div', 'week-races');
      
      if (weekData.races.length === 0) {
        const emptyMessage = this.createElement('div', 'week-no-race-message');
        emptyMessage.textContent = '🏖️ No race this week - enjoy the break!';
        weekRaces.appendChild(emptyMessage);
      }
      
      else {
        weekData.races.forEach((race, index) => {
          const raceItem = this.createElement('div', 'week-race-item');
        raceItem.style.cursor = 'pointer';
        raceItem.addEventListener('click', (e) => {
          // Don't navigate if clicking on podium links
          if (e.target.closest('.week-podium')) return;
          window.location.hash = `#/race/${race.raceId}`;
        });

        // Race info
        const raceInfo = this.createElement('div', 'week-race-info');
        
        const raceHeader = this.createElement('div', 'week-race-header');
        const roundBadge = this.createElement('span', 'week-round-badge');
        roundBadge.textContent = `R${race.round}`;
        raceHeader.appendChild(roundBadge);
        
        const raceName = this.createElement('a', 'week-race-name');
        raceName.href = `#/race/${race.raceId}`;
        raceName.textContent = race.raceName;
        raceHeader.appendChild(raceName);
        
        raceInfo.appendChild(raceHeader);
        
        const raceDetails = this.createElement('div', 'week-race-details');
        raceDetails.innerHTML = `
          <div class="week-race-circuit">🏁 ${race.circuitName}</div>
          <div class="week-race-location">📍 ${race.locality}, ${race.country}</div>
        `;
        
        const raceDate = new Date(race.date);
        const dateStr = raceDate.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric' 
        });
        const dateDiv = this.createElement('div', 'week-race-date');
        dateDiv.textContent = dateStr;
        raceDetails.appendChild(dateDiv);
        
        raceInfo.appendChild(raceDetails);
        raceItem.appendChild(raceInfo);

        // Status indicator and podium
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const raceDateOnly = new Date(race.date);
        raceDateOnly.setHours(0, 0, 0, 0);

        let status = '';
        let statusClass = '';
        const isCompleted = race.hasResults || raceDateOnly < today;
        
        // Create podium container (centered)
        if (isCompleted) {
          status = 'Completed';
          statusClass = 'status-completed';
          
          // Get podium results for completed race
          const podium = this.getPodiumResults(race.raceId);
          if (podium && podium.length > 0) {
            const podiumContainer = this.createElement('div', 'week-podium');
            
            podium.forEach((result, idx) => {
              const driver = dataStore.indexes.driverById.get(result.driverId);
              if (driver) {
                const podiumItem = this.createElement('a', 'week-podium-item');
                podiumItem.href = `#/driver/${result.driverId}`;
                podiumItem.addEventListener('click', (e) => {
                  e.stopPropagation();
                });
                
                const position = idx + 1;
                const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
                
                podiumItem.innerHTML = `
                  <span class="podium-position">${medal}</span>
                  <span class="podium-driver">${driver.code || driver.name}</span>
                `;
                
                // Add team color if available
                if (driver.teamColor) {
                  podiumItem.style.borderLeftColor = driver.teamColor;
                }
                
                podiumContainer.appendChild(podiumItem);
              }
            });
            
            raceItem.appendChild(podiumContainer);
          }
        } else if (raceDateOnly.getTime() === today.getTime()) {
          status = 'Today';
          statusClass = 'status-today';
        } else {
          status = 'Upcoming';
          statusClass = 'status-upcoming';
        }

        const statusBadge = this.createElement('div', ['week-race-status', statusClass]);
        statusBadge.textContent = status;
        raceItem.appendChild(statusBadge);

          weekRaces.appendChild(raceItem);
        });
      }

      weekSection.appendChild(weekRaces);
      weekContainer.appendChild(weekSection);
    });

    this.root.appendChild(weekContainer);
  }

  getPodiumResults(raceId) {
    // Get top 3 finishers for the race
    const results = dataStore.data.raceResults
      .filter(r => r.raceId === raceId)
      .sort((a, b) => a.position - b.position)
      .slice(0, 3);
    
    return results.length > 0 ? results : null;
  }
}
