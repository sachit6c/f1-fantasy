// app.js - Application bootstrap

import { initTheme } from './lib/theme.js';
import { ViewManager } from './views/view-manager.js';
import { HomeView } from './views/home-view.js';
import { DraftView } from './views/draft-view.js';
import { TeamComparisonView } from './views/team-comparison-view.js';
import { CalendarView } from './views/calendar-view.js';
import { RaceDetailView } from './views/race-detail-view.js';
import { DriverProfileView } from './views/driver-profile-view.js';
import { ConstructorProfileView } from './views/constructor-profile-view.js';
import { DriversListView } from './views/drivers-list-view.js';
import { ConstructorsListView } from './views/constructors-list-view.js';

// Apply theme immediately at module parse time — avoids flash of wrong theme
initTheme();

// Apply Chart.js global theme defaults once the library is ready
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  Chart.defaults.font.size    = 13;
  Chart.defaults.color        = '#8B949E';
  Chart.defaults.borderColor  = '#30363D';
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.padding  = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = '#2E343D';
  Chart.defaults.plugins.tooltip.borderColor     = '#484F58';
  Chart.defaults.plugins.tooltip.borderWidth     = 1;
  Chart.defaults.plugins.tooltip.padding         = 10;
  Chart.defaults.plugins.tooltip.titleColor      = '#E6EDF3';
  Chart.defaults.plugins.tooltip.bodyColor       = '#8B949E';
  Chart.defaults.plugins.tooltip.cornerRadius    = 8;
  Chart.defaults.plugins.tooltip.displayColors   = true;
  Chart.defaults.plugins.tooltip.boxPadding      = 4;
}
// Chart.js loads after this module; schedule for next task
setTimeout(applyChartDefaults, 0);

async function init() {
  console.log('[App] Starting F1 Fantasy League...');

  try {
    // Initialize view manager
    const viewManager = new ViewManager();

    // Register views
    viewManager.registerView('home', new HomeView());
    viewManager.registerView('draft', new DraftView());
    viewManager.registerView('teams', new TeamComparisonView());
    viewManager.registerView('calendar', new CalendarView());
    viewManager.registerView('race', new RaceDetailView());
    viewManager.registerView('driver', new DriverProfileView());
    viewManager.registerView('constructor', new ConstructorProfileView());
    viewManager.registerView('drivers', new DriversListView());
    viewManager.registerView('constructors', new ConstructorsListView());

    // Initialize routing
    viewManager.init();

    console.log('[App] Application initialized');

  } catch (err) {
    console.error('[App] Initialization failed:', err);

    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
      <div class="error-message">
        <p class="error-icon">⚠️</p>
        <p class="error-text">Failed to load application: ${err.message}</p>
        <p style="margin-top: 1rem;">Check console for details.</p>
      </div>
    `;
  }
}

// Start app
init();
