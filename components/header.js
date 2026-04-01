// components/header.js
// Global header with navigation

import { draftStore } from '../lib/draft-store.js';
import { dataStore } from '../lib/data-store.js';

// ---------------------------------------------------------------------------
// F1 Era definitions — used for header gradient + drawer colour coding
// ---------------------------------------------------------------------------
const F1_ERAS = [
  {
    id: 'nge',        label: 'New Ground Effect Era', range: '2022 – present',
    years: [2022, 2099], from: '#0D0D1A', to: '#1E3A5F',
    accent: '#4A90D9', text: '#A0D4FF'
  },
  {
    id: 'hybrid',     label: 'Hybrid Era',             range: '2014 – 2021',
    years: [2014, 2021], from: '#00485E', to: '#009E8F',
    accent: '#27F4D2', text: '#7FFFF0'
  },
  {
    id: 'kers',       label: 'KERS Era',               range: '2010 – 2013',
    years: [2010, 2013], from: '#2D0050', to: '#6A0DAD',
    accent: '#C084FC', text: '#E9D5FF'
  },
  {
    id: 'v10v8',      label: 'V10 / V8 Era',           range: '2000 – 2009',
    years: [2000, 2009], from: '#7F0000', to: '#C84B00',
    accent: '#FF6B35', text: '#FFD4B3'
  },
  {
    id: 'electronic', label: 'Electronic Era',         range: '1990 – 1999',
    years: [1990, 1999], from: '#0A0A3E', to: '#1A1A8C',
    accent: '#6677FF', text: '#C4CCFF'
  },
  {
    id: 'turbo',      label: 'Turbo Era',              range: '1980 – 1989',
    years: [1980, 1989], from: '#5A0000', to: '#A00000',
    accent: '#FF5555', text: '#FFB3B3'
  },
  {
    id: 'wings',      label: 'Wings & Sponsorship Era', range: '1968 – 1979',
    years: [1968, 1979], from: '#6B2E00', to: '#C45E00',
    accent: '#FF9900', text: '#FFD980'
  },
  {
    id: 'classic',    label: 'Classic Era',            range: '1958 – 1967',
    years: [1958, 1967], from: '#0A2A0A', to: '#1A5C1A',
    accent: '#4CAF50', text: '#A8D8A8'
  },
  {
    id: 'origins',    label: 'Origins Era',            range: '1950 – 1957',
    years: [1950, 1957], from: '#2A2A2A', to: '#5A5A5A',
    accent: '#C0C0C0', text: '#E8E8E8'
  },
];

function getEra(year) {
  return F1_ERAS.find(e => year >= e.years[0] && year <= e.years[1]) || F1_ERAS[0];
}

export class Header {
  constructor() {
    this.element = null;
  }

  render() {
    const header = document.createElement('header');
    header.className = 'app-header';
    this.headerEl = header;
    
    // Get current season and its era
    const season = draftStore.currentSeason || 2026;
    const era = getEra(season);
    header.style.background = `linear-gradient(135deg, ${era.from} 0%, ${era.to} 100%)`;
    header.dataset.era = era.id;

    // --- Hamburger button ---
    const hamburger = document.createElement('button');
    hamburger.className = 'season-hamburger';
    hamburger.setAttribute('aria-label', 'Select season');
    hamburger.innerHTML = `<span></span><span></span><span></span>`;
    hamburger.addEventListener('click', () => this.openSeasonDrawer());

    // --- Logo/Title section ---
    const logoSection = document.createElement('div');
    logoSection.className = 'header-logo';

    const logo = document.createElement('h1');
    logo.innerHTML = `🏎️ F1 Fantasy League`;
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', () => { window.location.hash = '#/draft'; });

    // Current season badge (replaces dropdown)
    const seasonBadge = document.createElement('span');
    seasonBadge.className = 'season-current-badge';
    seasonBadge.textContent = season;
    seasonBadge.title = `${era.label} · click ☰ to switch`;
    seasonBadge.style.background = era.accent;
    seasonBadge.style.color = era.from;

    logoSection.appendChild(hamburger);
    logoSection.appendChild(logo);
    logoSection.appendChild(seasonBadge);

    header.appendChild(logoSection);

    // Navigation section
    const nav = document.createElement('nav');
    nav.className = 'header-nav';

    const navItems = [
      { label: 'Draft', hash: '#/draft', icon: '📋' },
      { label: 'Teams & Standings', hash: '#/teams', icon: '🏆' },
      { label: 'Constructors', hash: '#/constructors', icon: '🏎️' },
      { label: 'Drivers', hash: '#/drivers', icon: '👥' },
      { label: 'Calendar', hash: '#/calendar', icon: '📅' }
    ];

    navItems.forEach(item => {
      const link = document.createElement('a');
      link.href = item.hash;
      link.className = 'nav-link';

      // Add active class if current route matches
      if (window.location.hash === item.hash ||
          (window.location.hash === '' && item.hash === '#/draft')) {
        link.classList.add('active');
      }

      link.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;

      nav.appendChild(link);
    });

    header.appendChild(nav);

    // Right section (player names + settings)
    const headerRight = document.createElement('div');
    headerRight.className = 'header-right';
    
    // Draft status (if draft exists)
    if (draftStore.draft && draftStore.draft.players) {
      const players = draftStore.draft.players;
      const statusText = document.createElement('span');
      statusText.className = 'draft-players';
      statusText.textContent = `${players[0].name} vs ${players[1].name}`;
      headerRight.appendChild(statusText);
    }
    
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn-settings';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = 'Settings';
    settingsBtn.addEventListener('click', () => {
      this.showSettingsModal();
    });
    
    headerRight.appendChild(settingsBtn);
    header.appendChild(headerRight);

    this.element = header;
    return header;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.closeSeasonDrawer();
  }

  // -------------------------------------------------------------------------
  // Season drawer
  // -------------------------------------------------------------------------

  openSeasonDrawer() {
    if (document.querySelector('.season-drawer-overlay')) return; // already open

    const currentSeason = draftStore.currentSeason || 2026;
    const FIRST_YEAR = 1950;
    const LAST_YEAR  = 2026;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'season-drawer-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeSeasonDrawer();
    });

    // Drawer panel
    const drawer = document.createElement('div');
    drawer.className = 'season-drawer';

    // Drawer header
    const drawerHead = document.createElement('div');
    drawerHead.className = 'season-drawer-header';
    const drawerTitle = document.createElement('span');
    drawerTitle.textContent = 'Select Season';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'season-drawer-close';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => this.closeSeasonDrawer());
    drawerHead.appendChild(drawerTitle);
    drawerHead.appendChild(closeBtn);
    drawer.appendChild(drawerHead);

    // Build year list grouped by era (descending)
    const eras = [...F1_ERAS]; // already in descending order
    eras.forEach(era => {
      // Only include years within FIRST_YEAR..LAST_YEAR
      const eraStart = Math.max(era.years[0], FIRST_YEAR);
      const eraEnd   = Math.min(era.years[1], LAST_YEAR);
      if (eraStart > eraEnd) return;

      // Era heading
      const section = document.createElement('div');
      section.className = 'season-era-section';
      section.style.setProperty('--era-accent', era.accent);

      const heading = document.createElement('div');
      heading.className = 'season-era-heading';
      heading.innerHTML = `<span class="era-dot"></span><span>${era.label}</span><span class="era-range">${era.range}</span>`;
      section.appendChild(heading);

      // Year buttons (descending)
      const grid = document.createElement('div');
      grid.className = 'season-year-grid';
      for (let y = eraEnd; y >= eraStart; y--) {
        const btn = document.createElement('button');
        btn.className = 'season-year-btn' + (y === currentSeason ? ' active' : '');
        btn.textContent = y;
        btn.style.setProperty('--era-accent', era.accent);
        btn.style.setProperty('--era-text', era.text);
        btn.addEventListener('click', () => {
          this.closeSeasonDrawer();
          if (y !== currentSeason) {
            draftStore.setCurrentSeason(y);
            dataStore.setSeason(y);
            window.location.reload();
          }
        });
        grid.appendChild(btn);
      }
      section.appendChild(grid);
      drawer.appendChild(section);
    });

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);
    // Trigger transition
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  closeSeasonDrawer() {
    const overlay = document.querySelector('.season-drawer-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  updateActiveLink() {
    if (!this.element) return;

    const links = this.element.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.classList.remove('active');
      if (link.hash === window.location.hash ||
          (window.location.hash === '' && link.hash === '#/draft')) {
        link.classList.add('active');
      }
    });
  }

  showSettingsModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;

    const title = document.createElement('h2');
    title.textContent = 'Settings';
    title.style.cssText = 'color: #E10600; margin-bottom: 1.5rem;';
    modal.appendChild(title);

    // Player names section
    const savedNames = draftStore.loadPlayerNames();
    const player1Current = (savedNames && savedNames.player1) || 'Player 1';
    const player2Current = (savedNames && savedNames.player2) || 'Player 2';

    const namesSection = document.createElement('div');
    namesSection.style.cssText = 'margin-bottom: 2rem;';
    
    const namesTitle = document.createElement('h3');
    namesTitle.textContent = 'Player Names';
    namesTitle.style.cssText = 'font-size: 1.125rem; margin-bottom: 1rem; color: #1A1A1A;';
    namesSection.appendChild(namesTitle);

    const namesDesc = document.createElement('p');
    namesDesc.textContent = 'These names will be used across all seasons.';
    namesDesc.style.cssText = 'font-size: 0.875rem; color: #666; margin-bottom: 1rem;';
    namesSection.appendChild(namesDesc);

    const player1Input = document.createElement('input');
    player1Input.type = 'text';
    player1Input.placeholder = 'Player 1 Name';
    player1Input.value = player1Current;
    player1Input.style.cssText = 'width: 100%; padding: 0.75rem; border: 2px solid #E0E0E0; border-radius: 0.5rem; margin-bottom: 0.75rem; font-size: 1rem; box-sizing: border-box;';
    namesSection.appendChild(player1Input);

    const player2Input = document.createElement('input');
    player2Input.type = 'text';
    player2Input.placeholder = 'Player 2 Name';
    player2Input.value = player2Current;
    player2Input.style.cssText = 'width: 100%; padding: 0.75rem; border: 2px solid #E0E0E0; border-radius: 0.5rem; font-size: 1rem; box-sizing: border-box;';
    namesSection.appendChild(player2Input);

    modal.appendChild(namesSection);

    // Refresh section
    const refreshSection = document.createElement('div');
    refreshSection.style.cssText = 'border-top: 1px solid #E0E0E0; padding-top: 1.5rem; margin-bottom: 1.5rem;';

    const refreshTitle = document.createElement('h3');
    refreshTitle.textContent = 'Refresh Season Data';
    refreshTitle.style.cssText = 'font-size: 1.125rem; margin-bottom: 0.5rem; color: #1A1A1A;';
    refreshSection.appendChild(refreshTitle);

    const refreshDesc = document.createElement('p');
    refreshDesc.style.cssText = 'font-size: 0.875rem; color: #666; margin-bottom: 1rem;';
    refreshDesc.textContent = `Fetch the latest qualifying / race results for the ${dataStore.season} season from the F1 API.`;
    refreshSection.appendChild(refreshDesc);

    const refreshStatus = document.createElement('p');
    refreshStatus.style.cssText = 'font-size: 0.875rem; margin-bottom: 0.75rem; min-height: 1.25rem;';
    refreshSection.appendChild(refreshStatus);

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = `🔄 Refresh ${dataStore.season} Data`;
    refreshBtn.style.cssText = 'width: 100%; padding: 0.75rem; background: #0066CC; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer;';
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = '⏳ Fetching from API…';
      refreshStatus.style.color = '#666';
      refreshStatus.textContent = '';
      try {
        const result = await dataStore.refreshLiveData();
        refreshStatus.style.color = '#28A745';
        refreshStatus.textContent =
          `✅ Updated: ${result.raceResults} race results, ${result.qualifying} qualifying entries across ${result.rounds} rounds.`;
        refreshBtn.textContent = `✅ Done — reload page to persist`;
      } catch (err) {
        refreshStatus.style.color = '#DC3545';
        refreshStatus.textContent = `❌ Failed: ${err.message}`;
        refreshBtn.disabled = false;
        refreshBtn.textContent = `🔄 Refresh ${dataStore.season} Data`;
      }
    });
    refreshSection.appendChild(refreshBtn);

    modal.appendChild(refreshSection);

    // Reset section
    const resetSection = document.createElement('div');
    resetSection.style.cssText = 'border-top: 1px solid #E0E0E0; padding-top: 1.5rem; margin-bottom: 1.5rem;';
    
    const resetTitle = document.createElement('h3');
    resetTitle.textContent = 'Reset All Data';
    resetTitle.style.cssText = 'font-size: 1.125rem; margin-bottom: 0.5rem; color: #1A1A1A;';
    resetSection.appendChild(resetTitle);

    const resetDesc = document.createElement('p');
    resetDesc.textContent = 'This will clear all drafts from all seasons, as well as player names.';
    resetDesc.style.cssText = 'font-size: 0.875rem; color: #666; margin-bottom: 1rem;';
    resetSection.appendChild(resetDesc);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 Reset All Data';
    resetBtn.className = 'btn-danger';
    resetBtn.style.cssText = 'width: 100%; padding: 0.75rem; background: #DC3545; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer;';
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        draftStore.clearAll();
        window.location.hash = '#/draft';
        window.location.reload();
      }
    });
    resetSection.appendChild(resetBtn);

    modal.appendChild(resetSection);

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 1rem; justify-content: flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding: 0.75rem 1.5rem; background: #F5F5F5; color: #1A1A1A; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer;';
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'padding: 0.75rem 1.5rem; background: #E10600; color: white; border: none; border-radius: 0.5rem; font-size: 1rem; font-weight: 600; cursor: pointer;';
    saveBtn.addEventListener('click', () => {
      const p1 = player1Input.value.trim() || 'Player 1';
      const p2 = player2Input.value.trim() || 'Player 2';
      draftStore.savePlayerNames(p1, p2);
      
      // Update any existing drafts with new names
      // Update names in all existing draft seasons dynamically
      Object.keys(localStorage)
        .filter(k => k.startsWith('f1_fantasy_draft_'))
        .forEach(draftKey => {
          try {
            const draft = JSON.parse(localStorage.getItem(draftKey));
            if (draft && draft.players) {
              draft.players[0].name = p1;
              draft.players[1].name = p2;
              localStorage.setItem(draftKey, JSON.stringify(draft));
            }
          } catch (_) {}
        });
      
      document.body.removeChild(overlay);
      window.location.reload(); // Refresh to show updated names
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }
}
